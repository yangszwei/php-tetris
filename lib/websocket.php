<?php

    class WebSocket
    {
        private Socket $server;
        private array $clients = [];

        function __construct(string $address, int $port)
        {
            $this->server = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
            socket_set_option($this->server, SOL_SOCKET, SO_REUSEADDR, 1);
            socket_bind($this->server, $address, $port);
            socket_listen($this->server);
        }

        function run(): void
        {
            while (true) {
                $changed = array_merge([$this->server], $this->clients);
                $write = $except = null;
                socket_select($changed, $write, $except, 0, 10);

                if (in_array($this->server, $changed)) {
                    $client = socket_accept($this->server);
                    $this->clients[] = $client;

                    self::perform_handshake($client);

                    $index = array_search($this->server, $changed);
                    unset($changed[$index]);
                }

                foreach ($changed as $socket) {
                    while (socket_recv($socket, $data, 1024, 0) >= 1) {
                        $message = self::decode($data);
                        self::broadcast(self::encode($message));
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

        function broadcast(string $message): void
        {
            foreach ($this->clients as $client) {
                socket_write($client, $message, strlen($message));
            }
        }

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

        private static function encode(string $message): string
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

        private static function decode(string $message): string
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