<?php

    class Tetromino
    {
        public int $x;
        public int $y;
        public array $shape;

        public function __construct(array $shape, int $x = 0, int $y = 0)
        {
            $this->shape = $shape;
            $this->x = $x;
            $this->y = $y;
        }
    }

    class Tetris
    {
        public static array $TETROMINOES = [
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

        public static array $SCORES = [0, 40, 100, 300, 1200];

        public static array $GRAVITY = [
            0, 0.01667, 0.01875, 0.02143, 0.03, 0.0325, 0.0375,
            0.0425, 0.0475, 0.05625, 0.0625, 0.06875, 0.075, 0.0875,
            0.1, 0.125, 0.15, 0.175, 0.2, 0.25, 0.3
        ];

        public bool $is_playing = false;

        private array $matrix = [];

        private int $rows = 20;
        private int $hidden_rows = 4;
        private int $columns = 10;

        private Tetromino $current_tetromino;
        private array $held_tetromino = [];

        private array $bag = [];

        private float $last_update_time = 0;
        private bool $hold_used = false;
        private bool $is_hold_updated = true;
        private bool $is_tetromino_updated = true;
        private bool $is_playfield_updated = true;
        private bool $is_status_updated = true;

        private int $lines_cleared = 0;
        private int $score = 0;
        private int $level = 1;
        private float $drop_interval = 0;

        private bool $is_game_over = false;

        public function __construct()
        {
            $total_rows = $this->rows + $this->hidden_rows;
            $this->matrix = array_fill(0, $total_rows, array_fill(0, $this->columns, 0));
            $this->bag = self::generate_tetromino_bag();
        }

        public function start(): void
        {
            $this->bag = self::generate_tetromino_bag();
            $this->current_tetromino = $this->get_next_tetromino();
            $this->level = self::calculate_level($this->lines_cleared);
            $this->drop_interval = self::calculate_drop_interval($this->level);
        }

        public function hold(): void
        {
            if ($this->hold_used) {
                return;
            }

            if (empty($this->held_tetromino)) {
                $this->held_tetromino = $this->current_tetromino->shape;
                $this->current_tetromino = $this->get_next_tetromino();
            } else {
                $temp = $this->current_tetromino->shape;
                $x = (int)floor(($this->columns - count($this->held_tetromino)) / 2);
                $y = -$this->hidden_rows;
                $this->current_tetromino = new Tetromino($this->held_tetromino, $x, $y);
                $this->held_tetromino = $temp;
            }

            $this->hold_used = true;
            $this->is_hold_updated = true;
            $this->is_tetromino_updated = true;
        }

        public function move_left(): void
        {
            $this->move_tetromino(-1, 0);
        }

        public function move_right(): void
        {
            $this->move_tetromino(1, 0);
        }

        public function move_down(bool $reset): void
        {
            $this->drop_interval = $reset ? self::calculate_drop_interval($this->level) : 0.05;
        }

        public function rotate(): void
        {
            $tetromino = clone $this->current_tetromino;
            $height = count($tetromino->shape);
            $width = count($tetromino->shape[0]);

            $rotated = array_fill(0, $width, array_fill(0, $height, 0));
            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    $rotated[$x][$y] = $tetromino->shape[$height - $y - 1][$x];
                }
            }

            $tetromino->shape = $rotated;
            $tetromino->x += floor(($width - $height) / 2);
            $tetromino->y += floor(($height - $width) / 2);

            if (!$this->check_collision($tetromino)) {
                $this->current_tetromino = $tetromino;
                $this->is_tetromino_updated = true;
            }
        }

        public function update(): array
        {
            $current_time = microtime(true);
            $updates = array();

            if ($this->is_game_over) {
                $updates[] = ["type" => "over"];
                return $updates;
            }

            if ($current_time - $this->last_update_time >= $this->drop_interval) {
                $this->move_tetromino(0, 1);

                if (!$this->is_tetromino_updated) {
                    $this->merge_tetromino();
                    $this->current_tetromino = $this->get_next_tetromino();
                    $this->hold_used = false;
                    if ($this->check_collision($this->current_tetromino)) {
                        $this->is_game_over = true;
                    }
                }

                $lines_cleared = $this->clear_full_lines();

                if ($lines_cleared > 0) {
                    $this->score += self::$SCORES[$lines_cleared] * $this->level;
                    $this->level = self::calculate_level($this->lines_cleared);
                    $this->drop_interval = self::calculate_drop_interval($this->level);
                    $this->is_status_updated = true;
                }

                $this->last_update_time = microtime(true);
            }

            if ($this->is_playfield_updated) {
                $updates[] = array(
                    "type" => "playfield",
                    "matrix" => array_slice($this->matrix, $this->hidden_rows, $this->rows)
                );
            }

            if ($this->is_tetromino_updated) {
                $updates[] = array(
                    "type" => "tetromino",
                    "tetromino" => [
                        "x" => $this->current_tetromino->x,
                        "y" => $this->current_tetromino->y,
                        "shape" => $this->current_tetromino->shape
                    ]
                );
                $updates[] = array(
                    "type" => "next",
                    "shape" => $this->bag[count($this->bag) - 1]
                );
            }

            if ($this->is_hold_updated) {
                $updates[] = array(
                    "type" => "hold",
                    "shape" => $this->held_tetromino
                );
            }

            if ($this->is_status_updated) {
                $updates[] = array(
                    "type" => "status",
                    "score" => $this->score,
                    "level" => $this->level
                );
            }

            $this->is_status_updated = false;
            $this->is_hold_updated = false;
            $this->is_tetromino_updated = false;
            $this->is_playfield_updated = false;

            return $updates;
        }

        private function get_next_tetromino(): Tetromino
        {
            $shape = array_pop($this->bag);
            $x = (int)floor(($this->columns - count($shape)) / 2);
            $y = -$this->hidden_rows;

            if (count($this->bag) === 0) {
                $this->bag = self::generate_tetromino_bag();
            }

            return new Tetromino($shape, $x, $y);
        }

        private function check_collision(Tetromino $tetromino): bool
        {
            for ($dy = 0; $dy < count($tetromino->shape); $dy++) {
                for ($dx = 0; $dx < count($tetromino->shape[$dy]); $dx++) {
                    if ($tetromino->shape[$dy][$dx] !== 0) {
                        $x = $tetromino->x + $dx;
                        $y = $tetromino->y + $dy;
                        // Check if tetromino is out of playfield bounds.
                        if ($x < 0 || $x >= $this->columns || $y < -$this->hidden_rows || $y >= $this->rows) {
                            return true;
                        }
                        // Check if tetromino is colliding with another tetromino.
                        if ($this->matrix[$y + $this->hidden_rows][$x] !== 0) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        private function move_tetromino(int $x, int $y): void
        {
            $tetromino = clone $this->current_tetromino;
            $tetromino->x += $x;
            $tetromino->y += $y;
            if (!$this->check_collision($tetromino)) {
                $this->current_tetromino = $tetromino;
                $this->is_tetromino_updated = true;
            }
        }

        private function merge_tetromino(): void
        {
            for ($dy = 0; $dy < count($this->current_tetromino->shape); $dy++) {
                for ($dx = 0; $dx < count($this->current_tetromino->shape[$dy]); $dx++) {
                    if ($this->current_tetromino->shape[$dy][$dx] !== 0) {
                        $x = $this->current_tetromino->x + $dx;
                        $y = $this->current_tetromino->y + $dy + $this->hidden_rows;
                        $this->matrix[$y][$x] = $this->current_tetromino->shape[$dy][$dx];
                    }
                }
            }
            $this->is_playfield_updated = true;
        }

        private function clear_full_lines(): int
        {
            $lines_cleared = 0;
            for ($y = 0; $y < count($this->matrix); $y++) {
                $is_full = true;
                for ($x = 0; $x < count($this->matrix[$y]); $x++) {
                    if ($this->matrix[$y][$x] === 0) {
                        $is_full = false;
                        break;
                    }
                }
                if ($is_full) {
                    array_splice($this->matrix, $y, 1);
                    array_unshift($this->matrix, array_fill(0, $this->columns, 0));
                    $lines_cleared++;
                }
            }
            if ($lines_cleared > 0) {
                $this->is_playfield_updated = true;
                $this->lines_cleared += $lines_cleared;
            }
            return $lines_cleared;
        }

        private static function generate_tetromino_bag(): array
        {
            $bag = array_keys(self::$TETROMINOES);
            shuffle($bag);
            return array_map(fn($key) => self::$TETROMINOES[$key], $bag);
        }

        private static function calculate_level(int $lines_cleared): int
        {
            return floor($lines_cleared / 10) + 1;
        }

        private static function calculate_drop_interval(int $level): float
        {
            return 1 / (self::$GRAVITY[min($level, count(self::$GRAVITY) - 1)] * 60);
        }
    }
