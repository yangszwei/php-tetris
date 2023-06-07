<?php
    include "lib/tetris.php";
    include "lib/websocket.php";

    /** The application configuration. */
    $CONFIG = parse_ini_file('config.ini', true);
    if (!$CONFIG) {
        die('Error: Failed to load config.ini.');
    }

    /**
     * @var TetrisGame[] $games An associative array of games, indexed by their client ids.
     */
    $games = array();

    /**
     * The WebSocket server.
     */
    $server = new WebSocket($CONFIG['server']['address'], $CONFIG['server']['port']);

    // Creates a game instance for the new client.
    $server->on_open = function (Socket $socket, string $id) use (&$games): void {
        $games[$id] = new TetrisGame();
    };

    // Handles the client's messages.
    $server->on_message = function (Socket $socket, string $id, string $message) use (&$games, $server): void {
        $data = json_decode($message, true);
        if (!is_array($data)) return;

        switch ($data['action']) {
            case "start":
                $games[$id]->start();
                $games[$id]->is_playing = true;
                $server->send($id, game_message('start'));
                break;
            case "pause":
                $games[$id]->is_playing = false;
                $server->send($id, game_message('pause')); // ack
                break;
            case "resume":
                $games[$id]->reset();
                $games[$id]->is_playing = true;
                $server->send($id, game_message('resume')); // ack
                break;
            case "reset":
                $games[$id]->reset();
                break;
            case "game_over":
                $games[$id]->is_playing = false;
                break;
            default:
                dispatch_game_action($games[$id], $data['action']);
                break;
        }
    };

    // Updates the game state and sends it to the client.
    $server->on_tick = function () use (&$games, $server): void {
        foreach ($games as $id => $game) {
            foreach ($game->update() as $update) {
                $server->send($id, $update);
            }
        }
    };

    // Removes the game instance for the closed client.
    $server->on_closed = function (string $id) use (&$games): void {
        unset($games[$id]);
    };

    // Starts the server.
    $server->run();
