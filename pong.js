
    // --- Canvas Setup ---
    const container = document.getElementById('game-container');
    const canvas = document.getElementById('pongCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const resetButton = document.getElementById('resetButton');
    const winCounterDisplay = document.getElementById('win-counter');

    // --- Game Constants ---
    const PADDLE_WIDTH_RATIO = 0.02;
    const PADDLE_HEIGHT_RATIO = 0.2;
    const BALL_RADIUS_RATIO = 0.0125;
    const WINNING_SCORE = 5;

    // --- Game State ---
    let gameState = 'ready'; // 'ready', 'playing', 'gameOver'
    let playerWins = 0;
    let aiWins = 0;
    let animationFrameId;
    let particles = [];

    // --- Sound Effects ---
    const synth = new Tone.Synth().toDestination();
    const hitSound = () => synth.triggerAttackRelease("C4", "8n");
    const scoreSound = () => synth.triggerAttackRelease("G5", "8n");

    // --- Game Objects (will be sized dynamically) ---
    let player, ai, ball;

    // --- Sizing and Responsiveness ---
    function resizeCanvas() {
        const { width, height } = container.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;

        // Dynamically size game objects
        const paddleWidth = canvas.width * PADDLE_WIDTH_RATIO;
        const paddleHeight = canvas.height * PADDLE_HEIGHT_RATIO;
        const ballRadius = canvas.height * BALL_RADIUS_RATIO;

        player = { x: 10, y: canvas.height / 2 - paddleHeight / 2, width: paddleWidth, height: paddleHeight, color: 'var(--glow-color-player)', score: 0 };
        ai = { x: canvas.width - paddleWidth - 10, y: canvas.height / 2 - paddleHeight / 2, width: paddleWidth, height: paddleHeight, color: 'var(--glow-color-ai)', score: 0 };
        ball = { x: canvas.width / 2, y: canvas.height / 2, radius: ballRadius, speed: 7, velocityX: 5, velocityY: 5, color: 'var(--glow-color-ball)' };
        
        // Redraw the screen after resize
        render();
    }

    // --- Drawing Functions ---
    function drawRect(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillRect(x, y, w, h);
    }
    function drawArc(x, y, r, color) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
    }
    function drawNet() {
        ctx.shadowBlur = 5;
        for (let i = 0; i <= canvas.height; i += 15) {
            drawRect(canvas.width / 2 - 1, i, 2, 10, 'var(--glow-color-neutral)');
        }
    }
    function drawText(text, x, y, color, sizeRatio = 0.05) {
        const fontSize = canvas.height * sizeRatio;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.font = `${fontSize}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y);
    }

    // --- Particle Effects ---
    function createParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            particles.push({
                x, y,
                color,
                radius: Math.random() * 3 + 1,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                alpha: 1
            });
        }
    }
    function updateAndDrawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.05;
            if (p.alpha <= 0) {
                particles.splice(i, 1);
            } else {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                drawArc(p.x, p.y, p.radius, p.color);
                ctx.restore();
            }
        }
    }
    
    // --- Game Logic ---
    function resetBall(newGame = false) {
        if (newGame) {
            player.score = 0;
            ai.score = 0;
        }
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.speed = canvas.width * 0.009; // Scale speed
        ball.velocityX = (Math.random() > 0.5 ? 1 : -1) * ball.speed * 0.7;
        ball.velocityY = (Math.random() > 0.5 ? 1 : -1) * ball.speed * 0.7;
    }

    function collision(b, p) {
        b.top = b.y - b.radius; b.bottom = b.y + b.radius; b.left = b.x - b.radius; b.right = b.x + b.radius;
        p.top = p.y; p.bottom = p.y + p.height; p.left = p.x; p.right = p.x + p.width;
        return b.right > p.left && b.bottom > p.top && b.left < p.right && b.top < p.bottom;
    }

    function update() {
        if (gameState !== 'playing') return;

        ball.x += ball.velocityX;
        ball.y += ball.velocityY;

        ai.y += (ball.y - (ai.y + ai.height / 2)) * 0.1;

        if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
            ball.velocityY = -ball.velocityY;
            hitSound();
        }

        if (ball.x - ball.radius < 0) {
            ai.score++;
            scoreSound();
            container.style.animation = 'shake 0.2s';
            setTimeout(() => container.style.animation = '', 200);
            resetBall();
        } else if (ball.x + ball.radius > canvas.width) {
            player.score++;
            scoreSound();
            container.style.animation = 'shake 0.2s';
            setTimeout(() => container.style.animation = '', 200);
            resetBall();
        }

        let currentPaddle = (ball.x < canvas.width / 2) ? player : ai;
        if (collision(ball, currentPaddle)) {
            hitSound();
            createParticles(ball.x, ball.y, currentPaddle.color);
            ball.velocityX = -ball.velocityX;
            ball.speed += 0.2;
            ball.velocityX = (ball.velocityX > 0 ? 1 : -1) * ball.speed;
            let collidePoint = (ball.y - (currentPaddle.y + currentPaddle.height / 2));
            collidePoint = collidePoint / (currentPaddle.height / 2);
            let angleRad = (Math.PI / 4) * collidePoint;
            ball.velocityY = ball.speed * Math.sin(angleRad);
        }

        if (player.score >= WINNING_SCORE || ai.score >= WINNING_SCORE) {
            gameState = 'gameOver';
            const winner = player.score >= WINNING_SCORE ? 'Player' : 'Computer';
            if(winner === 'Player') playerWins++; else aiWins++;
            updateWinDisplay();
            startButton.textContent = 'New Game';
            startButton.style.display = 'block';
            resetButton.style.display = 'block';
        }
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas instead of drawing black rect
        ctx.shadowBlur = 0; // Reset shadow for net
        drawNet();
        drawText(player.score, canvas.width / 4, canvas.height / 5, 'var(--glow-color-player)');
        drawText(ai.score, 3 * canvas.width / 4, canvas.height / 5, 'var(--glow-color-ai)');
        drawRect(player.x, player.y, player.width, player.height, player.color);
        drawRect(ai.x, ai.y, ai.width, ai.height, ai.color);
        drawArc(ball.x, ball.y, ball.radius, ball.color);
        updateAndDrawParticles();

        if (gameState === 'ready') {
            drawText('Click Start Game', canvas.width / 2, canvas.height / 2, '#fff', 0.04);
        } else if (gameState === 'gameOver') {
            const winner = player.score >= WINNING_SCORE ? 'Player' : 'Computer';
            drawText(`${winner} Wins!`, canvas.width / 2, canvas.height / 2, '#fff', 0.05);
        }
    }
    
    function gameLoop() {
        update();
        render();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function updateWinDisplay() {
        winCounterDisplay.textContent = `Player: ${playerWins} - Computer: ${aiWins}`;
    }

    // --- Event Listeners ---
    function movePaddle(y) {
        let rect = canvas.getBoundingClientRect();
        player.y = y - rect.top - player.height / 2;
    }
    canvas.addEventListener('mousemove', (evt) => movePaddle(evt.clientY));
    canvas.addEventListener('touchmove', (evt) => {
        evt.preventDefault();
        movePaddle(evt.touches[0].clientY);
    });

    startButton.addEventListener('click', () => {
        if (gameState === 'ready' || gameState === 'gameOver') {
            Tone.start(); // Required for audio to work in browser
            resetBall(true);
            gameState = 'playing';
            startButton.style.display = 'none';
            resetButton.style.display = 'none';
        }
    });

    resetButton.addEventListener('click', () => {
        playerWins = 0;
        aiWins = 0;
        updateWinDisplay();
        gameState = 'ready';
        resetBall(true);
        startButton.textContent = 'Start Game';
        resetButton.style.display = 'none';
    });
    
    window.addEventListener('resize', resizeCanvas);

    // --- Initial Call ---
    resizeCanvas();
    updateWinDisplay();
    gameLoop();

