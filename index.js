/**
 * @typedef {number[][]} Drawable
 */

/**
 * @typedef {{ x: number; y: number; drawable: Drawable }} Tetromino
 */

class Playfield {
    /** @type {CanvasRenderingContext2D} */
    #ctx;

    /** @type {Drawable} */
    #matrix;

    #offsetRows = 3;

    #cellSize = 30;

    #strokeWidth = 1;

    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.#ctx = canvas.getContext('2d');
        this.#matrix = Array(20 + this.#offsetRows)
            .fill(undefined)
            .map(() => Array(10).fill(0));
    }

    /**
     * Gets the height of the playfield in cells. Note that this does not include the offset rows.
     * */
    get height() {
        return this.#matrix.length - this.#offsetRows;
    }

    /** Gets the width of the playfield in cells. */
    get width() {
        return this.#matrix[0].length;
    }

    has(y, x) {
        return (
            y >= -this.#offsetRows &&
            y < this.#matrix.length - this.#offsetRows &&
            x >= 0 &&
            x < this.#matrix[0].length
        )
    }

    set(y, x, value) {
        this.#matrix[y + this.#offsetRows][x] = value;
    }

    get(y, x) {
        if (y < -this.#offsetRows || y > this.#matrix.length - this.#offsetRows - 1) return -1;
        if (!x && x !== 0) return this.#matrix[y + this.#offsetRows];
        if (x < 0 || x > this.#matrix[0].length - 1) return -1;
        return this.#matrix[y + this.#offsetRows][x];
    }

    /**
     * Merges a tetromino into the playfield matrix.
     *
     * @param {Tetromino} tetromino - The tetromino to merge.
     */
    merge(tetromino) {
        for (let dy = 0; dy < tetromino.drawable.length; dy++) {
            for (let dx = 0; dx < tetromino.drawable[dy].length; dx++) {
                if (tetromino.drawable[dy][dx] !== 0) {
                    this.set(tetromino.y + dy, tetromino.x + dx, tetromino.drawable[dy][dx]);
                }
            }
        }
    }

    /**
     * Removes a row from the playfield matrix.
     *
     * @param {number} y - The row to remove.
     * */
    remove(y) {
        for (let dy = y; dy > 0; dy--) {
            for (let x = 0; x < this.#matrix[0].length; x++) {
                this.set(dy, x, this.get(dy - 1, x));
            }
        }
    }

    /** Render the matrix to the playfield canvas. */
    render() {
        this.draw(0, 0, this.#matrix.slice(this.#offsetRows));
    }

    /**
     * Draw a drawable at the given coordinates.
     *
     * @param {number} x - The x coordinate of the drawable.
     * @param {number} y - The y coordinate of the drawable.
     * @param {Drawable} drawable - The drawable to draw.
     */
    draw(x, y, drawable) {
        for (let dy = 0; dy < drawable.length; dy++) {
            for (let dx = 0; dx < drawable[dy].length; dx++) {
                if (drawable[dy][dx] !== 0) {
                    this.fill(x + dx, y + dy, drawable[dy][dx]);
                }
            }
        }
    }

    /**
     * Draw the "Game Over" screen.
     */
    drawGameOver() {
        const backgroundWidth = 300;
        const backgroundHeight = 80;
        const backgroundX = (canvas.width - backgroundWidth) / 2;
        const backgroundY = (canvas.height - backgroundHeight) / 2;

        // Draw the background
        this.#ctx.fillStyle = "#f9fafb";
        this.#ctx.fillRect(backgroundX, backgroundY, backgroundWidth, backgroundHeight);

        // Set the text properties
        this.#ctx.font = `30px "Noto Sans TC"`;
        this.#ctx.fillStyle = '#111827';
        this.#ctx.textAlign = "center";
        this.#ctx.textBaseline = "middle";

        // Draw the "Game Over" text
        const text = "Game Over";
        const textX = canvas.width / 2;
        const textY = canvas.height / 2;
        this.#ctx.fillText(text, textX, textY);
    }

    /**
     * Fill a cell with the given color.
     *
     * @param {number} x - The x coordinate of the cell.
     * @param {number} y - The y coordinate of the cell.
     * @param {number} color - The index of the color to fill. See {@link Playfield.#colors}.
     * */
    fill(x, y, color) {
        const pos = (n) => n * this.#cellSize + this.#strokeWidth;
        const size = this.#cellSize - this.#strokeWidth * 2;
        this.#ctx.fillStyle = TetrominoBag.colors[color - 1];
        this.#ctx.fillRect(pos(x), pos(y), size, size);
    }

    /** Clear the playfield canvas. */
    clear() {
        this.#ctx.clearRect(0, 0, this.#ctx.canvas.width, this.#ctx.canvas.height);
    }
}

class TetrominoView {
    /** @type {CanvasRenderingContext2D} */
    #ctx;

    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.#ctx = canvas.getContext('2d');
    }

    /**
     * Draw a drawable in the center of the canvas.
     *
     * @param {Drawable} drawable - The drawable to draw.
     */
    draw(drawable) {
        this.#ctx.clearRect(0, 0, this.#ctx.canvas.width, this.#ctx.canvas.height);

        // Calculate the shape dimensions without 0 columns and rows
        let minX = drawable[0].length;
        let minY = drawable.length;
        let maxX = 0;
        let maxY = 0;

        // Find the bounds of the drawable by non-zero values
        for (let dy = 0; dy < drawable.length; dy++) {
            for (let dx = 0; dx < drawable[dy].length; dx++) {
                if (drawable[dy][dx] !== 0) {
                    minX = Math.min(minX, dx);
                    minY = Math.min(minY, dy);
                    maxX = Math.max(maxX, dx);
                    maxY = Math.max(maxY, dy);
                }
            }
        }

        // Remove the 0 columns
        let trimmedDrawable = drawable.map(row => row.slice(minX, maxX + 1));

        // Remove the 0 rows
        const trimmedHeight = maxY - minY + 1;
        trimmedDrawable = trimmedDrawable.slice(minY, minY + trimmedHeight);

        // Calculate the centering offsets
        const canvasSize = 120;
        let cellSize = 30;
        let strokeWidth = 1;

        let x = Math.floor((canvasSize - trimmedDrawable[0].length * cellSize) / 2);
        let y = Math.floor((canvasSize - trimmedDrawable.length * cellSize) / 2);

        // Check if the shape is vertically or horizontally 4
        if (trimmedDrawable.length === 4 || trimmedDrawable[0].length === 4) {
            const shrinkSize = 90;
            cellSize = shrinkSize / Math.max(trimmedDrawable.length, trimmedDrawable[0].length);
            const shrinkOffset = (canvasSize - shrinkSize) / 2;
            x = shrinkOffset + Math.ceil((shrinkSize - trimmedDrawable[0].length * cellSize) / 2);
            y = shrinkOffset + Math.ceil((shrinkSize - trimmedDrawable.length * cellSize) / 2);
        }

        const pos = (n) => n + strokeWidth;
        const size = cellSize - strokeWidth * 2;

        // Draw the centered shape
        for (let dy = 0; dy < trimmedDrawable.length; dy++) {
            for (let dx = 0; dx < trimmedDrawable[dy].length; dx++) {
                if (trimmedDrawable[dy][dx] !== 0) {
                    this.#ctx.fillStyle = TetrominoBag.colors[trimmedDrawable[dy][dx] - 1];
                    this.#ctx.fillRect(pos(x + dx * cellSize), pos(y + dy * cellSize), size, size);
                }
            }
        }
    }
}

class TetrominoBag {
    /** Tetromino colors in order of I, J, L, O, S, T, Z. */
    static colors = ['#00CCFF', '#0044FF', '#FF8800', '#FFCC00', '#00FF44', '#AA00FF', '#FF0044'];

    /** @type {Object<string, Drawable>} */
    static tetrominoes = {
        I: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ],
        J: [
            [2, 0, 0],
            [2, 2, 2],
            [0, 0, 0],
        ],
        L: [
            [0, 0, 3],
            [3, 3, 3],
            [0, 0, 0],
        ],
        O: [
            [4, 4],
            [4, 4],
        ],
        S: [
            [0, 5, 5],
            [5, 5, 0],
            [0, 0, 0]
        ],
        T: [
            [0, 6, 0],
            [6, 6, 6],
            [0, 0, 0]
        ],
        Z: [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0]
        ],
    }

    /** @type {Drawable[]} */
    #bag = [];

    #generateBag() {
        const bag = Object.keys(TetrominoBag.tetrominoes);
        for (let i = 0; i < bag.length - 1; i++) {
            const j = Math.floor(Math.random() * (bag.length - i)) + i;
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        this.#bag = bag.map((name) => TetrominoBag.tetrominoes[name]);
    }

    /**
     * Gets the next tetromino from the bag without removing it. This is useful for previewing the
     * next tetromino.
     *
     * @returns {number[][]}
     */
    nextTetromino() {
        if (this.#bag.length === 0) {
            this.#generateBag();
        }

        return this.#bag[this.#bag.length - 1];
    }

    /**
     * Get the next tetromino from the bag. The caller is responsible for adding the coordinates of
     * the tetromino.
     *
     * @returns {Drawable}
     */
    getNextTetromino() {
        if (this.#bag.length === 0) {
            this.#generateBag();
        }

        return this.#bag.pop();
    }
}

class TetrisGame {
    /** Score values for clearing lines, the index is the number of lines cleared. */
    static #scores = [0, 40, 100, 300, 1200];

    /** Gravity values for each level, the index is the level. */
    static #gravity = [
        0, 0.01667, 0.01875, 0.02143, 0.03, 0.0325, 0.0375,
        0.0425, 0.0475, 0.05625, 0.0625, 0.06875, 0.075, 0.0875,
        0.1, 0.125, 0.15, 0.175, 0.2, 0.25, 0.3
    ]

    /** @type {HTMLCanvasElement} */
    #canvas;

    /** @type {TetrominoView} */
    #hold;

    /** @type {TetrominoView} */
    #next;

    /** @type {HTMLParagraphElement} */
    #levelMonitor;

    /** @type {HTMLParagraphElement} */
    #scoreMonitor;

    /** @type {Playfield} */
    #playfield;

    /** @type {TetrominoBag} */
    #bag = new TetrominoBag();

    /** @type {Tetromino} */
    #currentTetromino;

    /** @type {Drawable} */
    #heldTetromino;

    /** Whether the held tetromino has been used. */
    #isHeld = false;

    /** @type {Drawable} */
    #nextTetromino;

    /** The interval between tetromino drops in milliseconds. */
    #dropInterval = 1000;

    /** The timestamp of the last tetromino drop. */
    #lastDropTime = 0;

    /** The number of lines cleared. */
    #linesCleared = 0;

    /** The current level. */
    #level = 1;

    /** The current score. */
    #score = 0;

    /** Whether the game is updated. The playfield should re-render when this is true. */
    #update = true;

    /** Whether the game is over. */
    #over = false;

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {HTMLCanvasElement} hold
     * @param {HTMLCanvasElement} next
     * @param {HTMLParagraphElement} level
     * @param {HTMLParagraphElement} score
     */
    constructor(canvas, hold, next, level, score) {
        this.#canvas = canvas;
        this.#hold = new TetrominoView(hold);
        this.#next = new TetrominoView(next);
        this.#levelMonitor = level;
        this.#scoreMonitor = score;
        this.#playfield = new Playfield(canvas);
    }

    start() {
        document.addEventListener("keyup", this.keyup.bind(this));
        document.addEventListener("keydown", this.keydown.bind(this));
        this.#levelMonitor.textContent = this.#level.toString();
        this.#scoreMonitor.textContent = this.#score.toString();

        this.#currentTetromino = this.#getNextTetromino();
        this.#nextTetromino = this.#bag.nextTetromino();
        this.#next.draw(this.#nextTetromino);

        // Start the render loop.
        this.#frame();
    }

    keydown(event) {
        switch (event.key) {
            case "h":
                this.#holdTetromino();
                break;
            case "ArrowLeft":
                this.#moveTetromino(-1, 0);
                break;
            case "ArrowRight":
                this.#moveTetromino(1, 0);
                break;
            case "ArrowDown":
                if (!event.repeat) {
                    this.#dropInterval = 50;
                }
                break;
            case "ArrowUp":
                this.#rotateTetromino();
                break;
        }
    }

    keyup(event) {
        switch (event.key) {
            case "ArrowDown":
                this.#dropInterval = TetrisGame.#calculateDropInterval(this.#level);
                break;
        }
    }

    get over() {
        return this.#over;
    }

    #getNextTetromino() {
        const drawable = this.#bag.getNextTetromino();
        return {
            x: Math.floor((this.#playfield.width - drawable[0].length) / 2),
            y: -drawable.length,
            drawable,
        }
    }

    /** Clone a tetromino. (for collision detection) */
    #cloneTetromino(tetromino) {
        const clone = {
            x: tetromino.x,
            y: tetromino.y,
            drawable: [],
        };
        for (let i = 0; i < tetromino.drawable.length; i++) {
            const row = tetromino.drawable[i];
            clone.drawable[i] = Array.from(row);
        }
        return clone;
    }

    /** Checks whether the tetromino collides with the playfield or another tetromino. */
    #checkCollision(tetromino = this.#currentTetromino) {
        for (let dy = 0; dy < tetromino.drawable.length; dy++) {
            for (let dx = 0; dx < tetromino.drawable[dy].length; dx++) {
                if (tetromino.drawable[dy][dx] !== 0) {
                    if (
                        !this.#playfield.has(tetromino.y + dy, tetromino.x + dx) ||
                        this.#playfield.get(tetromino.y + dy, tetromino.x + dx) !== 0
                    ) {
                        return true;
                    }
                }
            }
        }
    }

    /** Check whether the game is over. */
    #checkGameOver() {
        if (this.#checkCollision(this.#currentTetromino)) {
            this.#over = true;
        }
    }

    /** Holds the current tetromino. */
    #holdTetromino() {
        if (this.#isHeld) return;
        if (this.#heldTetromino) {
            const held = this.#heldTetromino;
            this.#heldTetromino = this.#currentTetromino.drawable;
            this.#currentTetromino = {
                x: Math.floor((this.#playfield.width - held[0].length) / 2),
                y: -held.length,
                drawable: held,
            }
            this.#isHeld = true;
        } else {
            this.#heldTetromino = this.#currentTetromino.drawable;
            this.#currentTetromino = this.#getNextTetromino();
            this.#nextTetromino = this.#bag.nextTetromino();
            this.#next.draw(this.#nextTetromino);
        }
        this.#hold.draw(this.#heldTetromino);
        this.#update = true;
    }

    #rotateTetromino() {
        const tetromino = this.#cloneTetromino(this.#currentTetromino);
        const y = tetromino.drawable.length;
        const x = tetromino.drawable[0].length;

        const rotated = Array(x).fill(undefined).map(() => Array(y).fill(0));
        for (let dy = 0; dy < y; dy++) {
            for (let dx = 0; dx < x; dx++) {
                rotated[x - dx - 1][dy] = tetromino.drawable[dy][dx];
            }
        }

        tetromino.drawable = rotated;
        if (this.#checkCollision(tetromino)) {
            return false;
        }

        this.#currentTetromino = tetromino;
        this.#update = true;
        return true;
    }

    /**
     * Move the current tetromino by (x, y) cells.
     *
     * @param {number} x - The number of cells to move horizontally.
     * @param {number} y - The number of cells to move vertically.
     * */
    #moveTetromino(x, y) {
        const tetromino = this.#cloneTetromino(this.#currentTetromino);
        tetromino.x += x;
        tetromino.y += y;
        if (this.#checkCollision(tetromino)) {
            return false;
        }
        this.#currentTetromino = tetromino;
        this.#update = true;
        return true;
    }

    /**
     * Drop the current tetromino by one cell.
     *
     * @returns {boolean} Whether the tetromino was dropped successfully.
     * */
    #dropTetromino() {
        return this.#moveTetromino(0, 1);
    }

    /**
     * Clear all full lines from the playfield.
     *
     * @returns {number} The number of lines cleared.
     * */
    #clearFullLines() {
        let linesCleared = 0;
        for (let y = 0; y < this.#playfield.height; y++) {
            if (this.#playfield.get(y).some(cell => cell === 0)) {
                continue;
            }
            this.#playfield.remove(y);
            linesCleared++;
        }
        return linesCleared;
    }

    /** Start rendering the game to the playfield. */
    #frame() {
        const now = performance.now();

        if (now - this.#lastDropTime > this.#dropInterval) {
            if (this.#dropTetromino()) {
                this.#update = true;
            } else {
                this.#playfield.merge(this.#currentTetromino);
                this.#currentTetromino = this.#getNextTetromino();
                this.#isHeld = false;
                this.#next.draw(this.#bag.nextTetromino());
                this.#checkGameOver();
            }

            const linesCleared = this.#clearFullLines();
            if (linesCleared > 0) {
                this.#linesCleared += linesCleared;
                this.#score += TetrisGame.#scores[linesCleared];
                this.#level = TetrisGame.#calculateLevel(this.#linesCleared);
                this.#update = true;
            }

            this.#lastDropTime = now;
        }

        if (this.#update) {
            this.#playfield.clear();
            this.#playfield.render();
            this.#playfield.draw(
                this.#currentTetromino.x,
                this.#currentTetromino.y,
                this.#currentTetromino.drawable,
            );
            this.#scoreMonitor.textContent = this.#score.toString();
            this.#levelMonitor.textContent = this.#level.toString();
            this.#update = false;
        }

        if (!this.#over) {
            requestAnimationFrame(this.#frame.bind(this));
        } else {
            this.#playfield.drawGameOver();
        }
    }

    /**
     * Calculate the current level.
     *
     * @param {number} linesCleared - The number of lines cleared.
     * @returns {number} The current level.
     * */
    static #calculateLevel(linesCleared) {
        return (linesCleared / 10 + 1) | 0;
    }

    /**
     * Calculate the drop interval for the current level.
     *
     * @param {number} level - The current level.
     * @returns {number} The drop interval in milliseconds.
     */
    static #calculateDropInterval(level) {
        return (1000 / (this.#gravity[Math.min(level, 20)] * 60)) | 0;
    }
}

const canvas = document.getElementById('playfield');
const hold = document.getElementById('hold');
const next = document.getElementById('next');
const level = document.getElementById('level');
const score = document.getElementById('score');
const game = new TetrisGame(canvas, hold, next, level, score);

game.start();
