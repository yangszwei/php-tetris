<?php

    /**
     * A tetromino is a *positioned* piece on the playfield.
     */
    class Tetromino
    {
        /**
         * @var int $x The x-coordinate of the tetromino.
         */
        public int $x;

        /**
         * @var int $y The y-coordinate of the tetromino.
         */
        public int $y;

        /**
         * @var number[][] $shape The shape of the tetromino with color information.
         */
        public array $shape;

        /**
         * @var bool $is_updated Whether the tetromino has unpushed updates.
         */
        public bool $is_updated = true;

        /**
         * Constructs a new tetromino.
         *
         * @param int $x The x-coordinate of the tetromino.
         * @param int $y The y-coordinate of the tetromino.
         * @param number[][] $shape The shape of the tetromino with color information.
         */
        public function __construct(int $x, int $y, array $shape)
        {
            $this->x = $x;
            $this->y = $y;
            $this->shape = $shape;
        }

        /**
         * Creates a new tetromino instance with the changed coordinates.
         *
         * @param Tetromino $tetromino The tetromino to move.
         * @param int $x The x-coordinate change.
         * @param int $y The y-coordinate change.
         * @return Tetromino The moved tetromino.
         */
        public static function move(Tetromino $tetromino, int $x, int $y): Tetromino
        {
            $updated = clone $tetromino;
            $updated->x += $x;
            $updated->y += $y;
            $updated->is_updated = true;
            return $updated;
        }

        /**
         * Creates a new tetromino instance with the rotated shape.
         *
         * @param Tetromino $tetromino The tetromino to rotate.
         * @param bool $clockwise Whether to rotate clockwise.
         * @return Tetromino The rotated tetromino.
         */
        public static function rotate(Tetromino $tetromino, bool $clockwise): Tetromino
        {
            $updated = clone $tetromino;
            $size = count($tetromino->shape);

            $updated->shape = array_fill(0, $size, array_fill(0, $size, 0));
            for ($i = 0; $i < $size; $i++) {
                for ($j = 0; $j < $size; $j++) {
                    if ($clockwise) {
                        $updated->shape[$i][$j] = $tetromino->shape[$size - $j - 1][$i];
                    } else {
                        $updated->shape[$i][$j] = $tetromino->shape[$j][$size - $i - 1];
                    }
                }
            }

            $updated->is_updated = true;
            return $updated;
        }

        /**
         * Creates a new tetromino shape array without empty rows and columns.
         * This is useful when the tetromino position is relative.
         *
         * @param number[][] $shape The shape to trim.
         * @return number[][] The trimmed shape.
         */
        public static function trim(array $shape): array
        {
            $top = count($shape);
            $left = count($shape[0]);
            $bottom = 0;
            $right = 0;

            for ($y = 0; $y < count($shape); $y++) {
                for ($x = 0; $x < count($shape[$y]); $x++) {
                    if ($shape[$y][$x] !== 0) {
                        $top = min($top, $y);
                        $left = min($left, $x);
                        $bottom = max($bottom, $y);
                        $right = max($right, $x);
                    }
                }
            }

            return array_map(
                fn($row) => array_slice($row, $left, $right - $left + 1),
                array_slice($shape, $top, $bottom - $top + 1)
            );
        }
    }

    /**
     * A tetromino bag provides a sequence of tetrominos for the game to spawn.
     */
    class TetrominoBag
    {
        /**
         * @const number[][][] TETROMINOES The list of all possible tetrominoes.
         */
        public const TETROMINOES = [
            "I" => [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            "J" => [
                [2, 0, 0],
                [2, 2, 2],
                [0, 0, 0]
            ],
            "L" => [
                [0, 0, 3],
                [3, 3, 3],
                [0, 0, 0]
            ],
            "O" => [
                [4, 4],
                [4, 4]
            ],
            "S" => [
                [0, 5, 5],
                [5, 5, 0],
                [0, 0, 0]
            ],
            "T" => [
                [0, 6, 0],
                [6, 6, 6],
                [0, 0, 0]
            ],
            "Z" => [
                [7, 7, 0],
                [0, 7, 7],
                [0, 0, 0]
            ]
        ];

        /**
         * @var number[][][] $bag The bag of tetrominos.
         */
        private array $bag = [];

        /**
         * Constructs a new tetromino bag.
         */
        public function __construct()
        {
            $this->generate();
        }

        /**
         * Gets the next tetromino in the bag for spawning.
         *
         * @param Playfield $playfield
         *   The playfield to spawn the tetromino in. This is used to
         *   calculate the initial position of the tetromino.
         * @return Tetromino The next tetromino.
         */
        public function get_next(Playfield $playfield): Tetromino
        {
            $shape = array_shift($this->bag);
            if (count($this->bag) === 0) {
                $this->generate();
            }

            $x = (int)floor(($playfield->columns() - count($shape)) / 2);
            $y = -count($shape) - 1;
            return new Tetromino($x, $y, $shape);
        }

        /**
         * Gets the next tetromino in the bag for previewing. This does not remove
         * the tetromino from the bag.
         *
         * @return number[][] The next tetromino.
         */
        public function next(): array
        {
            return $this->bag[0];
        }

        /**
         * Updates the bag with a new sequence of tetrominos.
         *
         * @return void
         */
        private function generate(): void
        {
            $keys = array_keys(self::TETROMINOES);
            shuffle($keys);
            $this->bag = array_map(fn($key) => self::TETROMINOES[$key], $keys);
        }
    }

    /**
     * A playfield is the area where tetrominos are placed. This contains the visible area and
     * the hidden area (at the top of the playfield) for spawning new tetrominos.
     */
    class Playfield
    {
        /**
         * @var bool $is_updated Whether the playfield has unpushed updates.
         */
        public bool $is_updated = true;

        /**
         * @var int $hidden_rows The number of hidden rows in the playfield.
         */
        private int $hidden_rows;

        /**
         * @var number[][] $field The playfield array.
         */
        private array $field;

        /**
         * Constructs a new playfield.
         *
         * @param int $rows The number of rows in the playfield.
         * @param int $hidden_rows The number of hidden rows in the playfield.
         * @param int $columns The number of columns in the playfield.
         */
        public function __construct(int $rows = 20, int $hidden_rows = 4, int $columns = 10)
        {
            $this->hidden_rows = $hidden_rows;
            $this->field = array_fill(0, $rows + $hidden_rows, array_fill(0, $columns, 0));
        }

        /**
         * @return int The number of visible rows in the playfield.
         */
        public function rows(): int
        {
            return count($this->field) - $this->hidden_rows;
        }

        /**
         * @return int The number of hidden rows in the playfield.
         */
        public function hidden_rows(): int
        {
            return $this->hidden_rows;
        }

        /**
         * @return int The number of columns in the playfield.
         */
        public function columns(): int
        {
            return count($this->field[0]);
        }

        /**
         * @return number[][] The playfield array.
         */
        public function field(): array
        {
            return $this->field;
        }

        /**
         * Checks if the given tetromino collides with the playfield.
         *
         * @param Tetromino $tetromino The tetromino to check.
         * @return bool Whether the tetromino collides with the playfield.
         */
        public function is_collided(Tetromino $tetromino): bool
        {
            for ($dy = 0; $dy < count($tetromino->shape); $dy++) {
                for ($dx = 0; $dx < count($tetromino->shape[$dy]); $dx++) {
                    if ($tetromino->shape[$dy][$dx] > 0) {
                        $x = $tetromino->x + $dx;
                        $y = $tetromino->y + $dy;
                        // Check if the tetromino is out of bounds.
                        if (
                            $x < 0 || $x >= $this->columns() ||
                            $y < -$this->hidden_rows || $y >= $this->rows()
                        ) {
                            return true;
                        }
                        // Check if the tetromino is colliding with another tetromino.
                        if ($this->field[$y + $this->hidden_rows][$x] > 0) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        /**
         * Checks if the specified row is full.
         *
         * @param int $y The row to check.
         * @return bool Whether the row is full.
         */
        public function is_full_row(int $y): bool
        {
            return !in_array(0, $this->field[$y + $this->hidden_rows]);
        }

        /**
         * Merges a tetromino into the playfield. This is useful for locking a tetromino that has
         * reached the bottom.
         *
         * @param Tetromino $tetromino The tetromino to merge.
         * @return void
         */
        public function merge(Tetromino $tetromino): void
        {
            $this->field = self::merge_field($this->field, $this->hidden_rows, $tetromino);
            $this->is_updated = true;
        }

        /**
         * Removes a row from the playfield and shifts the rows above it down. This is useful for
         * clearing a full row.
         *
         * @param int $y The row to remove.
         * @return void
         */
        public function drop_row(int $y): void
        {
            array_splice($this->field, $y + $this->hidden_rows, 1);
            array_unshift($this->field, array_fill(0, $this->columns(), 0));
            $this->is_updated = true;
        }

        /**
         * Merges a tetromino into the playfield.
         *
         * @param number[][] $field The field to merge into.
         * @param Tetromino $tetromino The tetromino to merge.
         * @return number[][] The merged playfield array.
         */
        public static function merge_field(array $field, int $hidden_rows, Tetromino $tetromino): array
        {
            for ($dy = 0; $dy < count($tetromino->shape); $dy++) {
                for ($dx = 0; $dx < count($tetromino->shape[$dy]); $dx++) {
                    if ($tetromino->shape[$dy][$dx] > 0) {
                        $x = $tetromino->x + $dx;
                        $y = $tetromino->y + $dy;
                        $field[$y + $hidden_rows][$x] = $tetromino->shape[$dy][$dx];
                    }
                }
            }
            return $field;
        }
    }

    /**
     * A tetris game instance contains the game logic and state.
     */
    class TetrisGame
    {
        /**
         * @var int $rows The score indexed by the number of rows cleared.
         */
        private const SCORES = [0, 40, 100, 300, 1200];

        /**
         * @var int $rows The gravity indexed by the level.
         */
        private const GRAVITY = [
            0, 0.01667, 0.01875, 0.02143, 0.03, 0.0325, 0.0375,
            0.0425, 0.0475, 0.05625, 0.0625, 0.06875, 0.075, 0.0875,
            0.1, 0.125, 0.15, 0.175, 0.2, 0.25, 0.3
        ];

        /**
         * @var bool $is_playing
         * Whether the game is currently active. This controls whether the
         * game accepts commands and whether the game state can be updated.
         */
        public bool $is_playing = false;

        /**
         * @var Playfield $playfield The game playfield.
         */
        private Playfield $playfield;

        /**
         * @var TetrominoBag $bag The tetromino bag.
         */
        private TetrominoBag $bag;

        /**
         * @var Tetromino $current The current tetromino.
         */
        private Tetromino $current;

        /**
         * @var bool $is_tetromino_changed Whether the current tetromino has changed to a new one.
         */
        private bool $is_tetromino_changed = true;

        /**
         * @var number[][] The current held tetromino.
         */
        private array $hold = [];

        /**
         * @var bool $is_hold_changed Whether the held tetromino has changed to a new one.
         */
        private bool $is_hold_changed = false;

        /**
         * @var bool $is_hold_locked Whether the hold feature is locked.
         */
        private bool $is_hold_locked = false;

        /**
         * @var float $drop_interval The drop interval in seconds.
         */
        private float $drop_interval = 0;

        /**
         * @var float $last_drop_time The last time the tetromino was dropped.
         */
        private float $last_drop_time = 0;

        /**
         * @var int $cleared_rows The number of rows cleared in this game.
         */
        private int $cleared_rows = 0;

        /**
         * @var int $level The current level.
         */
        private int $level = 1;

        /**
         * @var int $score The current score.
         */
        private int $score = 0;

        /**
         * @var bool $is_status_updated Whether the game status has unpushed updates.
         */
        private bool $is_status_updated = false;

        /**
         * @var bool $is_game_over Whether the game is over.
         */
        private bool $is_game_over = false;

        /**
         * Constructs a new tetris game instance.
         */
        public function __construct()
        {
            $this->playfield = new Playfield();
            $this->bag = new TetrominoBag();
        }

        /**
         * Starts the game.
         *
         * @return void
         */
        public function start(): void
        {
            if ($this->is_playing) {
                return;
            }
            $this->current = $this->bag->get_next($this->playfield);
            $this->update_status();
        }

        /**
         * Holds the current tetromino.
         *
         * @return bool Whether the hold was successful.
         */
        public function hold(): bool
        {
            if ($this->is_hold_locked) {
                return false;
            }

            if (empty($this->hold)) {
                $this->hold = $this->current->shape;
                $this->current = $this->bag->get_next($this->playfield);
            } else {
                $temp = $this->current->shape;
                $x = (int)floor(($this->playfield->columns() - count($this->current->shape)) / 2);
                $y = $this->playfield->hidden_rows();
                $this->current = new Tetromino($x, $y, $this->hold);
                $this->hold = $temp;
            }

            $this->is_hold_locked = true;
            $this->is_hold_changed = true;

            return true;
        }

        /**
         * Moves the current tetromino left by one cell.
         *
         * @return bool Whether the tetromino was moved successfully.
         */
        public function move_left(): bool
        {
            return $this->move(-1, 0);
        }

        /**
         * Moves the current tetromino right by one cell.
         *
         * @return bool Whether the tetromino was moved successfully.
         */
        public function move_right(): bool
        {
            return $this->move(1, 0);
        }

        /**
         * Rotates the current tetromino.
         *
         * @param bool $clockwise Whether to rotate clockwise.
         * @return bool Whether the tetromino was rotated successfully.
         */
        public function rotate(bool $clockwise): bool
        {
            $temp = Tetromino::rotate($this->current, $clockwise);
            if ($this->playfield->is_collided($temp)) {
                return false;
            }
            $this->current = $temp;
            return true;
        }

        /**
         * Makes the current tetromino drop faster.
         *
         * @return bool Whether the drop interval was changed successfully.
         */
        public function soft_drop(): bool
        {
            $this->drop_interval = self::GRAVITY[$this->level];
            return true;
        }

        /**
         * Drops the current tetromino to the bottom of the playfield.
         *
         * @return bool Whether the tetromino was dropped successfully.
         */
        public function hard_drop(): bool
        {
            while ($this->drop()) {
                continue;
            }
            return true;
        }

        /**
         * Resets the drop interval to respective value of the current level.
         *
         * @return bool Whether the drop interval was reset successfully.
         */
        public function reset_drop_interval(): bool
        {
            $this->drop_interval = self::calculate_drop_interval($this->level);
            return true;
        }

        /**
         * Resets the special statuses of the game.
         *
         * @return void
         */
        public function reset(): void
        {
            $this->reset_drop_interval();
        }

        /**
         * Updates the game status.
         *
         * @return string[] The game update messages.
         */
        public function update(): array
        {
            if (!$this->is_playing) {
                return [];
            }

            $updates = array();

            if ($this->is_game_over) {
                $updates[] = game_message("game_over");
                return $updates;
            }

            if ($this->is_drop_interval_elapsed()) {
                $this->drop();
            }

            if ($this->playfield->is_updated) {
                $field = array_slice($this->playfield->field(), $this->playfield->hidden_rows());
                $updates[] = game_message("field", $field);
                $this->playfield->is_updated = false;
            }

            if ($this->current->is_updated) {
                $updates[] = game_message("tetromino", [
                    "x" => $this->current->x,
                    "y" => $this->current->y,
                    "shape" => $this->current->shape
                ]);

                $ghost = $this->ghost();
                $updates[] = game_message("ghost", [
                    "x" => $ghost->x,
                    "y" => $ghost->y,
                    "shape" => $ghost->shape
                ]);

                $this->current->is_updated = false;
            }

            if ($this->is_hold_changed) {
                $updates[] = game_message("hold", Tetromino::trim($this->hold));
                $this->is_hold_changed = false;
            }

            if ($this->is_tetromino_changed) {
                $updates[] = game_message("next", Tetromino::trim($this->bag->next()));
                $this->is_tetromino_changed = false;
            }

            if ($this->is_status_updated) {
                $updates[] = game_message("status", [
                    "level" => $this->level,
                    "score" => $this->score,
                    "cleared_rows" => $this->cleared_rows
                ]);
                $this->is_status_updated = false;
            }

            return $updates;
        }

        /**
         * Updates the game status.
         *
         * @param int $cleared_rows The number of rows cleared in the current update.
         * @return void
         */
        private function update_status(int $cleared_rows = 0): void
        {
            $this->score += self::SCORES[$cleared_rows] * $this->level;
            $this->level = self::calculate_level($this->cleared_rows);
            $this->drop_interval = self::calculate_drop_interval($this->level);
            $this->is_status_updated = true;
        }

        /**
         * @return bool Whether the drop interval has elapsed since the last drop.
         */
        private function is_drop_interval_elapsed(): bool
        {
            return microtime(true) - $this->last_drop_time >= $this->drop_interval;
        }

        /**
         * Moves the current tetromino by the given coordinates.
         *
         * @param int $x The x coordinate.
         * @param int $y The y coordinate.
         * @return bool Whether the tetromino was moved successfully.
         */
        private function move(int $x, int $y): bool
        {
            $temp = Tetromino::move($this->current, $x, $y);
            if ($this->playfield->is_collided($temp)) {
                return false;
            }
            $this->current = $temp;
            return true;
        }

        /**
         * Drops the current tetromino by one row.
         *
         * @return bool Whether the tetromino was dropped.
         */
        private function drop(): bool
        {
            $is_moved = $this->move(0, 1);
            if (!$is_moved) {
                $this->playfield->merge($this->current);
                $rows_cleared = $this->clear_full_rows();
                if ($rows_cleared > 0) {
                    $this->update_status($rows_cleared);
                }
                $this->current = $this->bag->get_next($this->playfield);
                $this->is_tetromino_changed = true;
                if ($this->playfield->is_collided($this->current)) {
                    $this->is_game_over = true;
                }
                $this->is_hold_locked = false;
                return false;
            }
            $this->last_drop_time = microtime(true);
            return true;
        }

        /**
         * Calculates the ghost tetromino of the current tetromino.
         *
         * @return Tetromino The ghost tetromino.
         */
        private function ghost(): Tetromino
        {
            $ghost = clone $this->current;
            $temp = clone $ghost;
            while (!$this->playfield->is_collided($temp)) {
                $ghost = $temp;
                $temp = Tetromino::move($ghost, 0, 1);
            }
            return $ghost;
        }

        /**
         * Clears all full rows from the playfield.
         *
         * @return int The number of rows cleared.
         */
        private function clear_full_rows(): int
        {
            $cleared_rows = 0;
            for ($y = 0; $y < $this->playfield->rows(); $y++) {
                if ($this->playfield->is_full_row($y)) {
                    $this->playfield->drop_row($y);
                    $cleared_rows++;
                }
            }
            if ($cleared_rows > 0) {
                $this->cleared_rows += $cleared_rows;
            }
            return $cleared_rows;
        }

        /**
         * Calculates the level from the number of cleared rows.
         *
         * @param int $cleared_rows The total number of cleared rows.
         * @return int The level.
         */
        private static function calculate_level(int $cleared_rows): int
        {
            return (int)floor($cleared_rows / 10) + 1;
        }

        /**
         * Calculates the drop interval from the level.
         *
         * @param int $level The level.
         * @return float The drop interval in seconds.
         */
        private static function calculate_drop_interval(int $level): float
        {
            return 1 / (self::GRAVITY[min($level, count(self::GRAVITY) - 1)] * 60);
        }
    }

    /**
     * Dispatches a game action from the given action string.
     *
     * @param TetrisGame $game The game.
     * @param string $action The action string.
     * @return null|bool Whether the action was successful.
     */
    function dispatch_game_action(TetrisGame $game, string $action): null|bool
    {
        if (!$game->is_playing) {
            return false;
        }
        return match ($action) {
            "hold" => $game->hold(),
            "move_left" => $game->move_left(),
            "move_right" => $game->move_right(),
            "rotate" => $game->rotate(true),
            "rotate_ccw" => $game->rotate(false),
            "soft_drop" => $game->soft_drop(),
            "hard_drop" => $game->hard_drop(),
            "reset_drop" => $game->reset_drop_interval(),
            default => false,
        };
    }

    /**
     * Creates a game message to send to the client.
     *
     * @param string $type The message type.
     * @param array|null $data The message data.
     * @return string The game message.
     */
    function game_message(string $type, array|null $data = null): string
    {
        return json_encode(["type" => $type, "data" => $data]);
    }
