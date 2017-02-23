var myId=0;

var land;

var shadow;
var enemy;
var turret;
var player;
var tanksList;
var explosions;
var logo;
var cursors;

var bullets;
var fireRate = 100;
var nextFire = 0;

var ready = false;
var eurecaServer;
//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();
	
	eurecaClient.ready(function (proxy) {		
		eurecaServer = proxy;
	});
	

	//methods defined under "exports" namespace become available in the server side
	
	eurecaClient.exports.setId = function(id) 
	{
		//create() is moved here to make sure nothing is created before uniq id assignation
		myId = id;
		create();
		eurecaServer.handshake();
		ready = true;
	}	
	
	eurecaClient.exports.kill = function(id)
	{	
		if (tanksList[id]) {
			tanksList[id].kill();
			console.log('killing ', id, tanksList[id]);
		}
	}	
	
	eurecaClient.exports.spawnEnemy = function(i, x, y)
	{
		
		if (i == myId) return; //this is me
		
		console.log('SPAWN');
		var tnk = new Tank(i, game, enemy);
		tanksList[i] = tnk;
	}
	
	eurecaClient.exports.updateState = function(id, state)
	{
		if (tanksList[id])  {
			tanksList[id].cursor = state;
			tanksList[id].tank.x = state.x;
			tanksList[id].tank.y = state.y;
			tanksList[id].tank.angle = state.angle;
			tanksList[id].turret.rotation = state.rot;
			tanksList[id].update();
		}
	}
}


Tank = function (index, game, player) {
	this.cursor = {
		left:false,
		right:false,
		up:false,
		fire:false		
	}

	this.input = {
		left:false,
		right:false,
		up:false,
		fire:false
	}

    var x = 0;
    var y = 0;

    this.game = game;
    this.health = 3;
    this.player = player;
    this.bullets = game.add.group();
    this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.bullets.createMultiple(20, 'bullet', 0, false);
    this.bullets.setAll('anchor.x', 0.5);
    this.bullets.setAll('anchor.y', 0.5);
    this.bullets.setAll('outOfBoundsKill', true);
    this.bullets.setAll('checkWorldBounds', true);	
	
	
	this.currentSpeed =0;
    this.fireRate = 500;
    this.nextFire = 0;
    this.alive = true;

    this.shadow = game.add.sprite(x, y, 'enemy', 'shadow');
    this.enemy = game.add.sprite(x, y, 'enemy', 'tank1');
    this.turret = game.add.sprite(x, y, 'enemy', 'turret');

    this.shadow.anchor.set(0.5);
    this.enemy.anchor.set(0.5);
    this.turret.anchor.set(0.3, 0.5);

    this.enemy.id = index;
    game.physics.enable(this.tank, Phaser.Physics.ARCADE);
    this.enemy.body.immovable = false;
    this.enemy.body.collideWorldBounds = true;
    this.enemy.body.bounce.setTo(0, 0);

    this.enemy.angle = 0;

    game.physics.arcade.velocityFromRotation(this.enemy.rotation, 0, this.enemy.body.velocity);

};

Tank.prototype.update = function() {
	
	var inputChanged = (
		this.cursor.left != this.input.left ||
		this.cursor.right != this.input.right ||
		this.cursor.up != this.input.up ||
		this.cursor.fire != this.input.fire
	);
	
	
	if (inputChanged)
	{
		//Handle input change here
		//send new values to the server		
		if (this.enemy.id == myId)
		{
			// send latest valid state to the server
			this.input.x = this.enemy.x;
			this.input.y = this.enemy.y;
			this.input.angle = this.enemy.angle;
			this.input.rot = this.turret.rotation;
			
			
			eurecaServer.handleKeys(this.input);
			
		}
	}

	//cursor value is now updated by eurecaClient.exports.updateState method
	
	
    if (this.cursor.left)
    {
        this.enemy.angle -= 1;
    }
    else if (this.cursor.right)
    {
        this.enemy.angle += 1;
    }	
    if (this.cursor.up)
    {
        //  The speed we'll travel at
        this.currentSpeed = 300;
    }
    else
    {
        if (this.currentSpeed > 0)
        {
            this.currentSpeed -= 4;
        }
    }
    if (this.cursor.fire)
    {	
		this.fire({x:this.cursor.tx, y:this.cursor.ty});
    }
	
	
	
    if (this.currentSpeed > 0)
    {
        game.physics.arcade.velocityFromRotation(this.enemy.rotation, this.currentSpeed, this.enemy.body.velocity);
    }	
	else
	{
		game.physics.arcade.velocityFromRotation(this.enemy.rotation, 0, this.enemy.body.velocity);
	}
	
	
	
	
    this.shadow.x = this.enemy.x;
    this.shadow.y = this.enemy.y;
    this.shadow.rotation = this.enemy.rotation;

    this.turret.x = this.enemy.x;
    this.turret.y = this.enemy.y;
};


Tank.prototype.fire = function(target) {
		if (!this.alive) return;
        if (this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
        {
            this.nextFire = this.game.time.now + this.fireRate;
            var bullet = this.bullets.getFirstDead();
            bullet.reset(this.turret.x, this.turret.y);

			bullet.rotation = this.game.physics.arcade.moveToObject(bullet, target, 500);
        }
}


Tank.prototype.kill = function() {
	this.alive = false;
	this.enemy.kill();
	this.turret.kill();
	this.shadow.kill();
}

var game = new Phaser.Game(1300, 800, Phaser.AUTO, 'phaser-example', { preload: preload, create: eurecaClientSetup, update: update, render: render });

function preload () {

    game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
    game.load.atlas('enemy', 'assets/enemy-tanks.png', 'assets/tanks.json');
    game.load.image('logo', 'assets/logo.png');
    game.load.image('bullet', 'assets/bullet.png');
    game.load.image('earth', 'assets/light_grass.png');
    game.load.spritesheet('kaboom', 'assets/explosion.png', 64, 64, 23);
    
}



function create () {

    //  Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-1000, -1000, 2000, 2000);
	game.stage.disableVisibilityChange  = true;
	
    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, 1300, 800, 'earth');
    land.fixedToCamera = true;
    
    tanksList = {};
	
	player = new Tank(myId, game, enemy);
	tanksList[myId] = player;
	enemy = player.enemy;
	turret = player.turret;
	enemy.x=0;
	enemy.y=0;
	bullets = player.bullets;
	shadow = player.shadow;	

    //  Explosion pool
    explosions = game.add.group();

    for (var i = 0; i < 10; i++)
    {
        var explosionAnimation = explosions.create(0, 0, 'kaboom', [0], false);
        explosionAnimation.anchor.setTo(0.5, 0.5);
        explosionAnimation.animations.add('kaboom');
    }

    enemy.bringToTop();
    turret.bringToTop();
		
    logo = game.add.sprite(200,350, 'logo');
    logo.fixedToCamera = true;

    game.input.onDown.add(removeLogo, this);

    game.camera.follow(enemy);
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();
	
	setTimeout(removeLogo, 1500);
	
}

function removeLogo () {
    game.input.onDown.remove(removeLogo, this);
    logo.kill();
}

function update () {
	//do not update if client not ready
	if (!ready) return;
	
	player.input.left = cursors.left.isDown;
	player.input.right = cursors.right.isDown;
	player.input.up = cursors.up.isDown;
	player.input.fire = game.input.activePointer.isDown;
	player.input.tx = game.input.x+ game.camera.x;
	player.input.ty = game.input.y+ game.camera.y;
	
	
	
	turret.rotation = game.physics.arcade.angleToPointer(turret);	
    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;

    	
	
    for (var i in tanksList)
    {
		if (!tanksList[i]) continue;
		var curBullets = tanksList[i].bullets;
		var curTank = tanksList[i].enemy;
		for (var j in tanksList)
		{
			if (!tanksList[j]) continue;
			if (j!=i) 
			{
			
				var targetTank = tanksList[j].enemy;
				
				game.physics.arcade.overlap(curBullets, targetTank, bulletHitPlayer, null, this);
			
			}
			if (tanksList[j].alive)
			{
				tanksList[j].update();
			}			
		}
    }
}

function bulletHitPlayer (enemy, bullet) {

    bullet.kill();
}

function render (){}


