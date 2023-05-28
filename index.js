/**
 * @typedef {number[][]} Drawable
 */

/**
 * @typedef {{ x: number; y: number; drawable: Drawable }} Tetromino
 */

class Playfield {
    /** Tetromino colors in order of I, J, L, O, S, T, Z. */
    static #colors = ['#00CCFF', '#0044FF', '#FF8800', '#FFCC00', '#00FF44', '#AA00FF', '#FF0044'];

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
     * Fill a cell with the given color.
     *
     * @param {number} x - The x coordinate of the cell.
     * @param {number} y - The y coordinate of the cell.
     * @param {number} color - The index of the color to fill. See {@link Playfield.#colors}.
     * */
    fill(x, y, color) {
        const pos = (n) => n * this.#cellSize + this.#strokeWidth;
        const size = this.#cellSize - this.#strokeWidth * 2;
        this.#ctx.fillStyle = Playfield.#colors[color - 1];
        this.#ctx.fillRect(pos(x), pos(y), size, size);
    }

    /** Clear the playfield canvas. */
    clear() {
        this.#ctx.clearRect(0, 0, this.#ctx.canvas.width, this.#ctx.canvas.height);
    }
}

class TetrominoBag {
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
    /** @type {HTMLCanvasElement} */
    #canvas;

    /** @type {Playfield} */
    #playfield;

    /** @type {TetrominoBag} */
    #bag = new TetrominoBag();

    /** @type {Tetromino} */
    #currentTetromino;

    /** The interval between tetromino drops in milliseconds. */
    #dropInterval = 1000;

    /** The timestamp of the last tetromino drop. */
    #lastDropTime = 0;

    /** Whether the game is updated. The playfield should re-render when this is true. */
    #update = true;

    /** Whether the game is over. */
    #over = false;

    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.#canvas = canvas;
        this.#playfield = new Playfield(canvas);
    }

    start() {
        document.addEventListener("keyup", this.keyup.bind(this));
        document.addEventListener("keydown", this.keydown.bind(this));
        this.#currentTetromino = this.#getNextTetromino();

        // Start the render loop.
        this.#frame();
    }

    keydown(event) {
        switch (event.key) {
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
                this.#dropInterval = 1000;
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

    /** Clear all full lines from the playfield. */
    #clearFullLines() {
        for (let y = 0; y < this.#playfield.height; y++) {
            if (this.#playfield.get(y).some(cell => cell === 0)) {
                continue;
            }

            this.#playfield.remove(y);
        }
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
                this.#checkGameOver();
            }
            this.#clearFullLines();
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
            this.#update = false;
        }

        if (!this.#over) {
            requestAnimationFrame(this.#frame.bind(this));
        }
    }
}

const canvas = document.getElementById('playfield');
const game = new TetrisGame(canvas);

game.start();
