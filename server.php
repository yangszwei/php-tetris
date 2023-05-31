<?php
    include "lib/tetris.php";
    include "lib/websocket.php";

    $server = new WebSocket("0.0.0.0", 8080);
    $games = array();

    $start_time = microtime(true);

    $server->on_open = function (Socket $socket, string $id) use ($server) {
        global $games;
        $games[$id] = new Tetris();
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
                $games[$id]->move_down($data["reset"]);
                break;
            case "rotate":
                $games[$id]->rotate();
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

    $server->on_close = function (string $id) use (&$games) {
        if (isset($games[$id])) {
            unset($games[$id]);
        }
    };

    $server->listen();
