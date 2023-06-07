// ----- CONFIGURATION CONSTANTS ----- //

/** The game server URL. */
const SERVER_URL = '';

// ----- DO NOT MODIFY BELOW THIS LINE ----- //

/** No operation. */
const noop = () => {
};

/**
 * Provides a base class for drawing tetrominoes.
 */
class Drawable {
    /** The tetromino colors. */
    static COLORS = [
        ['rgb(0, 204, 255)', 'rgba(0, 204, 255, 0.3)'], // I
        ['rgb(0, 68, 255)', 'rgba(0, 68, 255, 0.3)'],   // J
        ['rgb(255, 136, 0)', 'rgba(255, 136, 0, 0.3)'], // L
        ['rgb(255, 204, 0)', 'rgba(255, 204, 0, 0.3)'], // O
        ['rgb(0, 255, 68)', 'rgba(0, 255, 68, 0.3)'],   // S
        ['rgb(170, 0, 255)', 'rgba(170, 0, 255, 0.3)'], // T
        ['rgb(255, 0, 68)', 'rgba(255, 0, 68, 0.3)']    // Z
    ];

    /**
     * @type {number} The number of rows in the grid.
     */
    rows;

    /**
     * @type {number} The number of columns in the grid.
     */
    columns;

    /** The size of a cell in pixels. */
    cellSize = 30;

    /** The color of the tetromino. */
    strokeWidth = 1;

    /** @type {CanvasRenderingContext2D} */
    #ctx;

    /** The mutex lock for filling methods. */
    #fillLock = false;

    /**
     * @param {number} rows The number of rows in the grid.
     * @param {number} columns The number of columns in the grid.
     * @param {HTMLCanvasElement} canvas The canvas to draw on.
     */
    constructor(rows, columns, canvas) {
        this.rows = rows;
        this.columns = columns;
        this.#ctx = canvas.getContext('2d');
    }

    /**
     * Draws the given shape at the center of the canvas. Note that the shape
     * is expected to be trimmed.
     *
     * @param {number[][]} shape The shape to draw with color information.
     * @param {number} padding The padding around the shape in pixels.
     * @returns {void}
     */
    center(shape, padding = this.cellSize / 2) {
        const size = Math.max(shape.length, shape[0].length);
        const contentArea = Math.min(this.#ctx.canvas.width, this.#ctx.canvas.height) - padding * 2;
        const cellSize = Math.min(this.cellSize, Math.max(3, Math.floor(contentArea / size)));
        const strokeWidth = Math.max(1, this.strokeWidth * (cellSize / this.cellSize));
        const fillSize = cellSize - strokeWidth * 2;
        const top = Math.floor((this.#ctx.canvas.height - cellSize * shape.length) / 2);
        const left = Math.floor((this.#ctx.canvas.width - cellSize * shape[0].length) / 2);
        while (this.#fillLock) noop();
        this.#fillLock = true;
        for (let dy = 0; dy < shape.length; dy++) {
            for (let dx = 0; dx < shape[dy].length; dx++) {
                if (shape[dy][dx] !== 0) {
                    const x = left + dx * cellSize + strokeWidth;
                    const y = top + dy * cellSize + strokeWidth;
                    this.#ctx.fillStyle = Drawable.COLORS[shape[dy][dx] - 1][0];
                    this.#ctx.fillRect(x, y, fillSize, fillSize);
                }
            }
        }
        this.#fillLock = false;
    }

    /**
     * Draws the given shape at the given position.
     *
     * @param {number} x The x position of the shape.
     * @param {number} y The y position of the shape.
     * @param {number[][]} shape The shape to draw with color information.
     * @param {number} [colorType=0] The color type of the shape.
     * @returns {void}
     */
    draw(x, y, shape, colorType = 0) {
        while (this.#fillLock) noop();
        this.#fillLock = true;

        for (let dy = 0; dy < shape.length; dy++) {
            for (let dx = 0; dx < shape[dy].length; dx++) {
                if (shape[dy][dx] !== 0) {
                    this.#fill(x + dx, y + dy, shape[dy][dx], colorType);
                }
            }
        }

        this.#fillLock = false;
    }

    drawText(text, mode = 'normal') {
        while (this.#fillLock) noop();
        this.#fillLock = true;

        this.#ctx.font = `24px "Noto Sans TC"`;
        this.#ctx.textAlign = "center";
        this.#ctx.textBaseline = "middle";

        if (mode === 'normal') {
            const top = Math.floor((this.#ctx.canvas.height - 80) / 2);
            this.#ctx.fillStyle = "#f9fafb";
            this.#ctx.fillRect(0, top, this.#ctx.canvas.width, 80);
        }

        const textX = this.#ctx.canvas.width / 2;
        const textY = this.#ctx.canvas.height / 2;
        this.#ctx.fillStyle = mode === 'normal' ? '#111827' : '#f9fafb';
        this.#ctx.fillText(text, textX, textY);

        this.#fillLock = false;
    }

    /**
     * Clears the canvas.
     *
     * @returns {void}
     */
    clear() {
        while (this.#fillLock) noop();
        this.#fillLock = true;
        this.#ctx.fillStyle = '#1f2937';
        this.#ctx.clearRect(0, 0, this.#ctx.canvas.width, this.#ctx.canvas.height);
        this.#ctx.fillRect(0, 0, this.#ctx.canvas.width, this.#ctx.canvas.height);
        this.#fillLock = false;
    }

    /**
     * Fills a cell in the specified color at the given position.
     *
     * @param {number} x The x position of the cell.
     * @param {number} y The y position of the cell.
     * @param {number} color The index of the cell color in {@link Drawable.COLORS}.
     * @param {number} [colorType=0] The color type of the cell.
     * @returns {void}
     */
    #fill(x, y, color, colorType = 0) {
        const fillSize = this.cellSize - this.strokeWidth * 2;
        x = x * this.cellSize + this.strokeWidth;
        y = y * this.cellSize + this.strokeWidth;
        this.#ctx.fillStyle = Drawable.COLORS[color - 1][colorType];
        this.#ctx.fillRect(x, y, fillSize, fillSize);
    }
}

/**
 * A playfield of Tetris game.
 */
class Playfield extends Drawable {
    /** @type {HTMLCanvasElement} */
    canvas;

    /**
     * The current tetromino.
     *
     * @type {{ x: number, y: number, shape: number[][] }}
     * */
    #tetromino;

    /**
     * The ghost tetromino.
     *
     * @type {{ x: number, y: number, shape: number[][] }}
     */
    #ghost;

    /** @type {number[][]} */
    #field;

    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        super(20, 10, canvas);
        this.canvas = canvas;
    }

    /**
     * @param {{ x: number, y: number, shape: number[][] }} tetromino The current tetromino.
     */
    set tetromino(tetromino) {
        this.#tetromino = tetromino;
        this.render();
    }

    /**
     * @param {{ x: number, y: number, shape: number[][] }} ghost The ghost tetromino.
     */
    set ghost(ghost) {
        this.#ghost = ghost;
        this.render();
    }

    /**
     * @param {number[][]} field The playfield array.
     */
    set field(field) {
        this.#field = field;
        this.render();
    }

    /**
     * Renders the playfield.
     *
     * @returns {void}
     */
    render() {
        this.clear();
        if (this.#field) {
            this.draw(0, 0, this.#field, 0);
        }
        if (this.#tetromino) {
            this.draw(this.#tetromino.x, this.#tetromino.y, this.#tetromino.shape, 0);
        }
        if (this.#ghost) {
            this.draw(this.#ghost.x, this.#ghost.y, this.#ghost.shape, 1);
        }
    }
}

/**
 * This class is responsible for interacting with the Tetris server and rendering
 * the game state to the web page.
 */
class TetrisClient {
    /** @type {WebSocket} */
    #server;

    /** @type {Playfield} */
    #playfield;

    /** @type {Drawable} */
    #hold;

    /** @type {Drawable} */
    #next;

    /** @type {HTMLParagraphElement} */
    #score;

    /** @type {HTMLParagraphElement} */
    #level;

    /** @type {boolean} */
    #isPlaying = false;

    /** @type {function} */
    #boundBlurHandler;

    /** @type {function} */
    #boundKeyDownHandler;

    /** @type {function} */
    #boundKeyUpHandler;

    /**
     * @param {HTMLCanvasElement} playfield The canvas to draw the main playfield on.
     * @param {HTMLCanvasElement} hold The canvas to draw the hold tetromino on.
     * @param {HTMLCanvasElement} next The canvas to draw the next tetromino on.
     * @param {HTMLParagraphElement} score The element to display the score in.
     * @param {HTMLParagraphElement} level The element to display the level in.
     */
    constructor(playfield, hold, next, score, level) {
        this.#playfield = new Playfield(playfield);
        this.#hold = new Drawable(4, 4, hold);
        this.#next = new Drawable(4, 4, next);
        this.#score = score;
        this.#level = level;
    }

    /**
     * Connects to the Tetris server.
     *
     * @param {string} url The URL of the Tetris server.
     * @returns {void}
     */
    connect(url) {
        this.#server = new WebSocket(url);
        this.#server.onmessage = this.#onmessage.bind(this);
        this.#server.onopen = () => {
            this.#playfield.drawText('Click to start', 'text');
            this.#playfield.canvas.addEventListener('click', () => this.start(), {once: true});
        };
    }

    /**
     * Starts the game.
     *
     * @returns {void}
     */
    start() {
        this.#send('start');
    }

    /**
     * Sends a message in the expected format to the server.
     *
     * @param {string} action The action of the message.
     * @param {object} [data={}] The data to send.
     * @returns {void}
     */
    #send(action, data = {}) {
        this.#server.send(JSON.stringify({action, ...data}));
    }

    /**
     * Handles a message received from the server.
     *
     * @param {MessageEvent} event The message event.
     * @returns {void}
     */
    #onmessage(event) {
        const message = JSON.parse(event.data);
        switch (message.type) {
            case 'start':
                this.#playfield.clear();
                this.#boundBlurHandler = this.#onblur.bind(this);
                this.#boundKeyUpHandler = this.#onkeyup.bind(this);
                this.#boundKeyDownHandler = this.#onkeydown.bind(this);
                window.addEventListener('blur', this.#boundBlurHandler);
                document.addEventListener('keyup', this.#boundKeyUpHandler);
                document.addEventListener('keydown', this.#boundKeyDownHandler);
                this.#isPlaying = true;
                break;
            case 'hold':
                this.#hold.clear();
                this.#hold.center(message.data);
                break;
            case 'next':
                this.#next.clear();
                this.#next.center(message.data);
                break;
            case 'field':
                this.#playfield.field = message.data;
                break;
            case 'tetromino':
                this.#playfield.tetromino = message.data;
                break;
            case 'ghost':
                this.#playfield.ghost = message.data;
                break;
            case 'status':
                const {score, level} = message.data;
                this.#score.textContent = score.toString();
                this.#level.textContent = level.toString();
                break;
            case 'pause':
                const resume = () => {
                    document.removeEventListener('click', resume);
                    document.removeEventListener('keydown', resume);
                    this.#send('resume');
                }
                document.addEventListener('click', resume, {once: true});
                document.addEventListener('keydown', resume, {once: true});
                this.#isPlaying = false;
                this.#playfield.drawText('Paused');
                break;
            case 'resume':
                this.#isPlaying = true;
                break;
            case 'game_over':
                window.removeEventListener('blur', this.#boundBlurHandler);
                document.removeEventListener('keyup', this.#boundKeyUpHandler);
                document.removeEventListener('keydown', this.#boundKeyDownHandler);
                this.#playfield.drawText('Game Over');
                this.#send('game_over'); // ack
                break;
        }
    }

    #onblur() {
        if (!this.#isPlaying) return;
        this.#send('pause');
    }

    /**
     * Handles a keyup event.
     *
     * @param {KeyboardEvent} event The keyup event.
     * @returns {void}
     */
    #onkeyup(event) {
        if (!this.#isPlaying) return;

        switch (event.key) {
            case 'ArrowDown':
                this.#send('reset_drop');
                break;
        }
    }

    /**
     * Handles a keydown event.
     *
     * @param {KeyboardEvent} event The keydown event.
     * @returns {void}
     */
    #onkeydown(event) {
        if (!this.#isPlaying) return;

        switch (event.key) {
            case 'ArrowLeft':
                this.#send('move_left');
                break;
            case 'ArrowRight':
                this.#send('move_right');
                break;
            case 'ArrowUp':
                this.#send('rotate');
                break;
            case 'ArrowDown':
                this.#send('soft_drop');
                break;
            case 'c':
                this.#send('hold');
                break;
            case 'x':
                this.#send('rotate_ccw');
                break;
            case ' ':
                this.#send('hard_drop');
                break;
            case 'p':
                this.#send('pause');
                break;
        }
    }
}

/**
 * Infers the default game server URL from the current page URL.
 *
 * @returns {string} The websocket server URL.
 */
function defaultServerURL() {
    const {protocol, host, pathname} = location;
    const path = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}${path}server.php`;
}

/**
 * Initializes the Tetris client.
 */
function init() {
    const playfield = document.getElementById('playfield');
    const tetris = new TetrisClient(
        playfield,
        document.getElementById('hold'),
        document.getElementById('next'),
        document.getElementById('score'),
        document.getElementById('level'),
    );

    tetris.connect(SERVER_URL || defaultServerURL());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
