<?php

    class WebSocket
    {
        /**
         * The on message callback.
         *
         * Usage:
         *
         * ```
         * $server->on_message = function (Socket $socket, string $message) {
         *    // Do something with the message.
         * };
         * ```
         */
        public Closure $on_message;

        /** The server socket. */
        private Socket $server;

        /** The connected clients, indexed by their id. */
        private array $clients = [];

        function __construct(string $address, int $port)
        {
            $this->server = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
            socket_set_option($this->server, SOL_SOCKET, SO_REUSEADDR, 1);
            socket_bind($this->server, $address, $port);
            $this->on_message = fn(Socket $socket, string $message) => null;
        }

        /** Starts listening for connections. */
        function listen(): void
        {
            socket_listen($this->server);

            file_put_contents("php://stdout", "Server started listening!\n");

            while (true) {
                $changed = array_merge([$this->server], $this->clients);
                $write = $except = null;
                socket_select($changed, $write, $except, 0, 10);

                if (in_array($this->server, $changed)) {
                    $client = socket_accept($this->server);
                    $id = uniqid();
                    $this->clients[$id] = $client;

                    self::perform_handshake($client);

                    $this->send($client, json_encode([
                        "type" => "init",
                        "id" => $id
                    ]));

                    $index = array_search($this->server, $changed);
                    unset($changed[$index]);
                }

                foreach ($changed as $socket) {
                    if ($socket !== $this->server) {
                        while (socket_recv($socket, $data, 1024, 0) >= 1) {
                            $message = self::decode_message($data);
                            ($this->on_message)($socket, $message);
                            break 2;
                        }

                        $bytes = @socket_read($socket, 1024, PHP_NORMAL_READ);
                        if ($bytes === false) {
                            $index = array_search($socket, $this->clients);
                            unset($this->clients[$index]);
                        }
                    }
                }
            }
        }

        /**
         * Sends a message to a client.
         *
         * @param Socket | string $client The client to send the message to or its id.
         * @param string $message The message to send.
         */
        function send(Socket|string $client, string $message): void
        {
            if (is_string($client)) $client = $this->clients[$client];
            $encoded_message = self::encode_message($message);
            socket_write($client, $encoded_message, strlen($encoded_message));
        }

        /**
         * Broadcasts a message to all connected clients.
         *
         * @param string $message The message to broadcast.
         * @return void
         */
        function broadcast(string $message): void
        {
            $encoded_message = self::encode_message($message);
            $length = strlen($encoded_message);
            foreach ($this->clients as $client) {
                socket_write($client, $encoded_message, $length);
            }
        }

        /**
         * Performs the opening handshake with a client.
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
         * Encodes a message to be sent to a client.
         *
         * @param string $message The message to encode.
         * @return string The encoded message.
         */
        private static function encode_message(string $message): string
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
         * Decodes a message from a client.
         *
         * @param string $message The message to decode.
         * @return string The decoded message.
         */
        private static function decode_message(string $message): string
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
