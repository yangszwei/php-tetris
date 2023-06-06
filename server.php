<?php
    include "lib/tetris.php";
    include "lib/websocket.php";

    $config = parse_ini_file("config.ini", true);

    $server = new WebSocket($config["server"]["address"], $config["server"]["port"]);

    /**
     * @var TetrisGame[] $games
     */
    $games = array();

    $start_time = microtime(true);

    $server->on_open = function (Socket $socket, string $id) use ($server) {
        global $games;
        $games[$id] = new TetrisGame();
    };

    $server->on_message = function (Socket $socket, string $id, string $message) use ($server) {
        global $games;

        $data = json_decode($message, true);
        if ($data === null) return;

        switch ($data["type"]) {
            case "start":
                $games[$id]->start();
                $games[$id]->is_playing = true;
                $server->send($id, json_encode(["type" => "start"]));
                break;
            case "hold":
                $games[$id]->hold();
                break;
            case "left":
                $games[$id]->move_left();
                break;
            case "right":
                $games[$id]->move_right();
                break;
            case "down":
                if ($data["reset"] === true) {
                    $games[$id]->reset_drop_interval();
                } else {
                    $games[$id]->soft_drop();
                }
                break;
            case "rotate":
                $games[$id]->rotate(true);
                break;
            case "ack over":
                $games[$id]->is_playing = false;
                break;
        }
    };

    $server->on_tick = function () {
        global $games, $server;

        foreach ($games as $id => $game) {
            if (!$game->is_playing) continue;
            foreach ($game->update() as $update) {
                $server->send($id, json_encode($update));
            }
        }
    };

    $server->on_closed = function (string $id) use (&$games) {
        if (isset($games[$id])) {
            unset($games[$id]);
        }
    };

    $server->run();
