<?php

    $noop = function (): void {
    };

    /**
     * A simple websocket server implementation.
     */
    class WebSocket
    {
        /**
         * The callback run when a client connects.
         *
         * Usage:
         *
         * ```
         * $server->on_open = function (Socket $socket, string $id) {
         *    // ...
         * };
         */
        public Closure $on_open;

        /**
         * The callback run when a message is received from a client.
         *
         * Usage:
         *
         * ```
         * $server->on_message = function (Socket $socket, string $id, string $message) {
         *   // ...
         * };
         * ```
         */
        public Closure $on_message;

        /**
         * The callback run before each server poll.
         *
         * Usage:
         *
         * ```
         * $server->on_tick = function (float $time) {
         *   // ...
         * };
         * ```
         */
        public Closure $on_tick;

        /**
         * The callback run when a closed connection is detected.
         *
         * Usage:
         *
         * ```
         * $server->on_closed = function (string $id) {
         *  // ...
         * };
         */
        public Closure $on_closed;

        /**
         * @var Socket The server socket.
         */
        private Socket $server;

        /**
         * @var Socket[] The connected clients.
         */
        private array $clients = [];

        /**
         * @param string $address The address to bind to.
         * @param int $port The port to bind to.
         */
        public function __construct(string $address, int $port)
        {
            global $noop;
            $this->server = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
            socket_set_option($this->server, SOL_SOCKET, SO_REUSEADDR, 1);
            socket_bind($this->server, $address, $port);
            $this->on_open = $noop;
            $this->on_message = $noop;
            $this->on_tick = $noop;
            $this->on_closed = $noop;
        }

        /**
         * Starts the server to listen for connections.
         *
         * @return void
         */
        public function run(): void
        {
            socket_listen($this->server);

            for (; ;) {
                ($this->on_tick)(microtime(true));

                $this->poll();
            }
        }

        /**
         * Sends a message to the client.
         *
         * @param Socket|string $socket The client to send the message to or its id.
         * @param string $message The message to send.
         * @return bool Whether the message was sent.
         */
        public function send(Socket|string $socket, string $message): bool
        {
            if (is_string($socket)) $socket = $this->clients[$socket];
            if (!$socket) return false;
            $masked = self::mask($message);
            return socket_write($socket, $masked, strlen($masked)) !== false;
        }

        /**
         * Broadcasts a message to all connected clients.
         *
         * @param string $message The message to broadcast.
         * @return void
         */
        public function broadcast(string $message): void
        {
            $masked = self::mask($message);
            $length = strlen($masked);
            foreach ($this->clients as $client) {
                if (socket_getpeername($client, $address)) {
                    socket_write($client, $masked, $length);
                }
            }
        }

        /**
         * Checks for new connections, messages and closed connections, and
         * passes them to the respective callbacks.
         *
         * @return void
         */
        private function poll(): void
        {
            // Check for changed sockets.
            $changed = array_merge([$this->server], $this->clients);
            $write = $except = null;
            socket_select($changed, $write, $except, 0, 10);

            // Check for new connections on the server socket.
            if (in_array($this->server, $changed)) {
                $client = socket_accept($this->server);
                $id = uniqid();
                $this->clients[$id] = $client;

                self::perform_handshake($client);

                ($this->on_open)($client, $id);
            }

            foreach ($changed as $socket) {
                if ($socket !== $this->server) {
                    // Check for new messages.
                    while (@socket_recv($socket, $data, 1024, 0) >= 1) {
                        $id = array_search($socket, $this->clients);
                        $message = self::unmask($data);
                        if ($id && $message) {
                            ($this->on_message)($socket, $id, $message);
                        }
                        break 2;
                    }

                    // Check for closed connections.
                    $bytes = @socket_read($socket, 1024, PHP_NORMAL_READ);
                    if ($bytes === false) {
                        $id = array_search($socket, $this->clients);
                        ($this->on_closed)($id);
                        unset($this->clients[$id]);
                    }
                }
            }
        }

        /**
         * Performs the opening handshake with the client.
         *
         * @param Socket $client The client to perform the handshake with.
         * @return void
         */
        private static function perform_handshake(Socket $client): void
        {
            $headers = array();
            foreach (explode("\r\n", socket_read($client, 1024)) as $line) {
                if (preg_match('/\A(\S+): (.*)\z/', chop($line), $matches)) {
                    $line = rtrim($line);
                    if (preg_match('/\A(\S+): (.*)\z/', $line, $matches)) {
                        $headers[$matches[1]] = $matches[2];
                    }
                }
            }

            $sec_websocket_accept = base64_encode(
                pack('H*', sha1($headers['Sec-WebSocket-Key'] . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'))
            );

            $upgrade = "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" .
                "Upgrade: websocket\r\n" .
                "Connection: Upgrade\r\n" .
                "Sec-WebSocket-Accept:$sec_websocket_accept\r\n\r\n";

            socket_write($client, $upgrade, strlen($upgrade));
        }

        /**
         * Masks the message to be sent to the client.
         *
         * @param string $message The message to mask.
         * @return string The masked message.
         */
        private static function mask(string $message): string
        {
            $length = strlen($message);

            if ($length <= 125) {
                $header = pack('CC', 0x81, $length);
            } elseif ($length <= 65535) {
                $header = pack('CCn', 0x81, 126, $length);
            } else {
                $header = pack('CCNN', 0x81, 127, $length);
            }

            return $header . $message;
        }

        /**
         * Unmasks the message received from the client.
         *
         * @param string $message The message to unmask.
         * @return string The unmasked message.
         */
        private static function unmask(string $message): string
        {
            $length = ord($message[1]) & 127;

            if ($length === 126) {
                $masks = substr($message, 4, 4);
                $data = substr($message, 8);
            } elseif ($length === 127) {
                $masks = substr($message, 10, 4);
                $data = substr($message, 14);
            } else {
                $masks = substr($message, 2, 4);
                $data = substr($message, 6);
            }

            $text = '';
            for ($i = 0; $i < strlen($data); ++$i) {
                $text .= $data[$i] ^ $masks[$i % 4];
            }

            return $text;
        }
    }
