/**
 * @typedef {{ x: number; y: number; shape: number[][] }} Tetromino
 */

class Playfield {
    /** Tetromino colors in order of I, J, L, O, S, T, Z. */
    static colors = ['#00CCFF', '#0044FF', '#FF8800', '#FFCC00', '#00FF44', '#AA00FF', '#FF0044'];

    cellSize = 30;
    strokeWidth = 1;

    /** @type {number[][]} */
    matrix = [];

    /** @type {Tetromino} */
    currentTetromino;

    /** @param {CanvasRenderingContext2D} ctx */
    #ctx;

    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.#ctx = canvas.getContext("2d");
    }

    render() {
        this.clear();
        if (this.matrix) {
            this.draw(0, 0, this.matrix);
        }
        if (this.currentTetromino) {
            this.draw(this.currentTetromino.x, this.currentTetromino.y, this.currentTetromino.shape);
        }
    }

    /**
     * Draw a drawable at the given coordinates.
     *
     * @param {number} x - The x coordinate of the drawable.
     * @param {number} y - The y coordinate of the drawable.
     * @param {number[][]} shape - The shape to draw.
     */
    draw(x, y, shape) {
        for (let dy = 0; dy < shape.length; dy++) {
            for (let dx = 0; dx < shape[dy].length; dx++) {
                if (shape[dy][dx] !== 0) {
                    this.fill(x + dx, y + dy, shape[dy][dx]);
                }
            }
        }
    }

    /** Draw the start screen. */
    drawStartScreen() {
        // Set the text properties
        this.#ctx.font = `24px Ariel`;
        this.#ctx.fillStyle = '#f9fafb';
        this.#ctx.textAlign = "center";
        this.#ctx.textBaseline = "middle";

        // Draw the "Game Over" text
        const text = "點擊開始遊戲";
        const textX = this.#ctx.canvas.width / 2;
        const textY = this.#ctx.canvas.height / 2;
        this.#ctx.fillText(text, textX, textY);
    }

    /**
     * Draw the "Game Over" screen.
     */
    drawGameOver() {
        const backgroundWidth = 300;
        const backgroundHeight = 80;
        const backgroundX = (this.#ctx.canvas.width - backgroundWidth) / 2;
        const backgroundY = (this.#ctx.canvas.height - backgroundHeight) / 2;

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
        const textX = this.#ctx.canvas.width / 2;
        const textY = this.#ctx.canvas.height / 2;
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
        const pos = (n) => n * this.cellSize + this.strokeWidth;
        const size = this.cellSize - this.strokeWidth * 2;
        this.#ctx.fillStyle = Playfield.colors[color - 1];
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
     * @param {number[][]} drawable - The drawable to draw.
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
                    this.#ctx.fillStyle = Playfield.colors[trimmedDrawable[dy][dx] - 1];
                    this.#ctx.fillRect(pos(x + dx * cellSize), pos(y + dy * cellSize), size, size);
                }
            }
        }
    }
}

function start() {
    server.send(JSON.stringify({type: "start"}));
    document.getElementById("playfield").removeEventListener("click", start);
}

function keydown(event) {
    switch (event.key) {
        case "c":
            server.send(JSON.stringify({type: "hold"}));
            break;
        case "ArrowLeft":
            server.send(JSON.stringify({type: "left"}));
            break;
        case "ArrowRight":
            server.send(JSON.stringify({type: "right"}));
            break;
        case "ArrowDown":
            server.send(JSON.stringify({type: "down", reset: false}));
            break;
        case "ArrowUp":
            server.send(JSON.stringify({type: "rotate"}));
    }
}

function keyup(event) {
    switch (event.key) {
        case "ArrowDown":
            server.send(JSON.stringify({type: "down", reset: true}));
            break;
    }
}

const server = new WebSocket("ws://localhost:8080");

const playfield = new Playfield(document.getElementById("playfield"));
const hold = new TetrominoView(document.getElementById("hold"));
const next = new TetrominoView(document.getElementById("next"));

server.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case "start":
            playfield.clear();
            document.addEventListener("keydown", keydown);
            document.addEventListener("keyup", keyup);
            break;
        case "status":
            document.getElementById("score").textContent = data.score.toString();
            document.getElementById("level").textContent = data.level.toString();
            break;
        case "hold":
            if (data.shape.length) {
                hold.draw(data.shape);
            }
            break;
        case "next":
            next.draw(data.shape);
            break;
        case "playfield":
            playfield.matrix = data.matrix;
            playfield.render();
            break;
        case "tetromino":
            playfield.currentTetromino = data.tetromino;
            playfield.render();
            break;
        case "over":
            document.removeEventListener("keydown", keydown);
            document.removeEventListener("keyup", keyup);
            playfield.drawGameOver();
            server.send(JSON.stringify({type: "ack over"}));
            break;
    }
}

playfield.drawStartScreen();
document.getElementById("playfield").addEventListener("click", start);
