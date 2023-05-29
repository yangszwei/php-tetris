<!doctype html>
<html lang="zh-Hant-TW">
<head>
    <title>俄羅斯方塊</title>
    <meta charset="utf-8" />
    <meta name="author" content="102214209 楊斯惟" />
    <meta name="description" content="網路程式設計 - 學期程式作業" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="index.css" />
    <script src="index.js" async defer></script>
</head>
<body>

    <div id="wrapper">
        <div>
            <div class="preview-box">
                <p>Hold</p>
                <canvas id="hold" height="121" width="121"></canvas>
            </div>
        </div>
        <div>
            <canvas id="playfield" height="601" width="301"></canvas>
        </div>
        <div>
            <div class="preview-box">
                <p>下一個方塊</p>
                <canvas id="next" height="121" width="121"></canvas>
            </div>
            <div id="status">
                <p>Score</p>
                <p id="score" class="status-box">0</p>
                <p style="margin-top: 1rem;">Level</p>
                <p id="level" class="status-box">0</p>
            </div>
        </div>
    </div>

</body>
</html>
