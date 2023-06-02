# php-tetris

112 網路程式設計 - 學期程式作業

## How to run

### Docker

> Do NOT change the server section of config.ini when running with Docker.

Build the image:

```bash
docker build -t php-tetris .
```

Run the container:

```bash
docker run -it --rm -p 8080:80 php-tetris
```

The game will be available at http://{your-ip}:8080/.

### XAMPP (for Windows)

> Note that the XAMPP installation folder may be different on your computer.

Put the project folder into the web root directory and start Apache web server.

```powershell
mv php-tetris C:\xampp\htdocs
```

Enable the `sockets` extension in `php.ini`. This may be commented out by default.

```ini
extension=sockets
```

Start the websocket server with PHP CLI. Note that you can set the address and
port of the websocket server in the server section of `config.ini`.

```powershell
C:\xampp\php\php.exe C:\xampp\htdocs\php-tetris\server.php
```

Set `WEBSOCKET_URL` at line 3 of `index.js` to `ws://localhost:8000/` or the
address you set in `config.ini`.

```javascript
const WEBSOCKET_URL = 'ws://localhost:8000/';
```

The game will be available at http://localhost/php-tetris/.
