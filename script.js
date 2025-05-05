const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Constants for physics
const MAX_SPEED = 8;

// Ball class
class Ball {
    constructor(x, y, radius, color, mass = 1) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.mass = mass;
        
        // Initial velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        // Track previous position for debugging
        this.prevX = x;
        this.prevY = y;
        
        // Prevent sticking by tracking last collision
        this.lastCollision = null;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    // Simple wall collision
    handleWallCollision() {
        // Right wall
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx = -Math.abs(this.vx);
        }
        // Left wall
        else if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx = Math.abs(this.vx);
        }
        
        // Bottom wall
        if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.vy = -Math.abs(this.vy);
        }
        // Top wall
        else if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy = Math.abs(this.vy);
        }
    }

    // Completely different approach to ball collisions
    static handleBallCollision(b1, b2) {
        // Skip if we've already handled this collision pair this frame
        const collisionId = b1.id < b2.id ? `${b1.id}-${b2.id}` : `${b2.id}-${b1.id}`;
        if (b1.lastCollision === collisionId || b2.lastCollision === collisionId) {
            return false;
        }
        
        // Calculate distance between ball centers
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Exit if not colliding
        if (distance >= b1.radius + b2.radius) {
            return false;
        }
        
        // Mark as having collided
        b1.lastCollision = collisionId;
        b2.lastCollision = collisionId;
        
        // Calculate unit normal vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate tangent vector perpendicular to normal
        const tx = -ny;
        const ty = nx;
        
        // Resolve overlap - move balls apart along normal vector
        const overlap = (b1.radius + b2.radius - distance);
        const totalMass = b1.mass + b2.mass;
        
        // Move proportionally to mass
        const b1MoveRatio = b2.mass / totalMass;
        const b2MoveRatio = b1.mass / totalMass;
        
        // Move balls apart to prevent sticking
        b1.x -= nx * overlap * b1MoveRatio;
        b1.y -= ny * overlap * b1MoveRatio;
        b2.x += nx * overlap * b2MoveRatio;
        b2.y += ny * overlap * b2MoveRatio;
        
        // Decompose velocities into normal and tangential components
        const b1_normal = b1.vx * nx + b1.vy * ny;
        const b1_tangent = b1.vx * tx + b1.vy * ty;
        
        const b2_normal = b2.vx * nx + b2.vy * ny;
        const b2_tangent = b2.vx * tx + b2.vy * ty;
        
        // Calculate new normal velocities using one-dimensional elastic collision formula
        // Conservation of momentum and kinetic energy
        const m1 = b1.mass;
        const m2 = b2.mass;
        const v1 = b1_normal;
        const v2 = b2_normal;
        
        // Coefficient of restitution (slightly less than 1 for energy loss)
        const restitution = 0.92;
        
        // New normal velocities after collision
        const new_b1_normal = (v1 * (m1 - m2) + 2 * m2 * v2) / (m1 + m2) * restitution;
        const new_b2_normal = (v2 * (m2 - m1) + 2 * m1 * v1) / (m1 + m2) * restitution;
        
        // Convert normal and tangential components back to x and y velocities
        // Tangential component remains the same
        b1.vx = new_b1_normal * nx + b1_tangent * tx;
        b1.vy = new_b1_normal * ny + b1_tangent * ty;
        
        b2.vx = new_b2_normal * nx + b2_tangent * tx;
        b2.vy = new_b2_normal * ny + b2_tangent * ty;
        
        return true;
    }

    update(balls) {
        // Store previous position
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Update position with current velocity
        this.x += this.vx;
        this.y += this.vy;
        
        // Handle wall collisions
        this.handleWallCollision();
        
        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > MAX_SPEED) {
            this.vx = (this.vx / speed) * MAX_SPEED;
            this.vy = (this.vy / speed) * MAX_SPEED;
        }
        
        // Reset collision tracking on each new frame
        this.lastCollision = null;
    }
}

// Create balls with unique IDs and ensure they don't overlap
const colors = ['red', 'blue', 'green', 'orange', 'white'];
const balls = [];
let idCounter = 0;

// Helper to check if a position is valid (not overlapping with existing balls)
function isValidPosition(x, y, radius, existingBalls) {
    for (const ball of existingBalls) {
        const dx = ball.x - x;
        const dy = ball.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Add extra margin to prevent immediate collisions
        if (distance < ball.radius + radius + 10) {
            return false;
        }
    }
    
    // Also check we're not too close to walls
    if (x - radius < 10 || x + radius > canvas.width - 10 || 
        y - radius < 10 || y + radius > canvas.height - 10) {
        return false;
    }
    
    return true;
}

// Create balls with safe positions
function createBalls() {
    for (let i = 0; i < colors.length * 2; i++) {
        let x, y, valid;
        const radius = 20;
        const color = colors[i % colors.length];
        
        // Try to find a valid position
        let attempts = 0;
        do {
            x = radius + 10 + Math.random() * (canvas.width - radius * 2 - 20);
            y = radius + 10 + Math.random() * (canvas.height - radius * 2 - 20);
            valid = isValidPosition(x, y, radius, balls);
            attempts++;
        } while (!valid && attempts < 100);
        
        const ball = new Ball(x, y, radius, color);
        ball.id = idCounter++;
        balls.push(ball);
    }
}

// Animation loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update positions first
    balls.forEach(ball => ball.update(balls));
    
    // Then handle collisions separately
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            Ball.handleBallCollision(balls[i], balls[j]);
        }
    }
    
    // Draw balls
    balls.forEach(ball => ball.draw());
    
    requestAnimationFrame(animate);
}

// Create balls and start animation
createBalls();
animate(); 