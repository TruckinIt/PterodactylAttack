
Ptero.scene_options = (function(){

	var song;
	var paths;
	var enemies = [];

	var vibrate = true;

	function cleanup() {
		Ptero.input.removeTouchHandler(touchHandler);
		Ptero.orb.disableTouch();
		Ptero.bulletpool.clear();
	}

	function createPteros() {
		var wave = Ptero.assets.json["mainmenu_paths"];

		var models = wave.models;
		var numModels = models.length;

		enemies.length = 0;

		// iterate each enemy in wave
		for (j=0; j<numModels; j++) {

			// create enemy
			var e = Ptero.Enemy.fromState(models[j]);
			e.path.freezeAtEnd = true;
			e.whenHit = function() { Ptero.screen.shake(); };

			// add enemy to this scene's enemies
			enemies.push(e);
		}

		enemies[0].afterHit = function() {
			// high score
			switchScene(Ptero.scene_highscores);
		}
		enemies[1].afterHit = function() {
			// credits
			//switchScene(Ptero.scene_credits);
			enemies[1].init();
		}
		enemies[2].afterHit = function() {
			// back
			if (resumeOnReturn) {
				Ptero.resumeScene(returnScene);
			}
			else {
				switchScene(returnScene);
			}
		}
		enemies[3].whenHit = function() {
			vibrate = !vibrate;
			Ptero.screen.shake();
		}
		enemies[3].afterHit = function() {
			// vibration
			enemies[3].init();
		}
	}

	var time;
	function init() {
		time = 0;

		Ptero.input.addTouchHandler(touchHandler);
		Ptero.orb.allowTapToSelect(false);

		createPteros();

		Ptero.orb.init();
		Ptero.orb.setTargets(enemies);
        Ptero.orb.setNextOrigin(0,-1);
	}

	function switchScene(scene) {
		Ptero.fadeToScene(scene, 0.25);
	}

	var touchHandler = {
		start: function(x,y) {
		},
		move: function(x,y) {
		},
		end: function(x,y) {
		},
		cancel: function(x,y) {
		},
	};

	function update(dt) {
		time += dt;

		var i,numEnemies = enemies.length;
		for (i=0; i<numEnemies; i++) {
			enemies[i].update(dt);
			var pos = enemies[i].getPosition();
			if (pos) {
				Ptero.deferredSprites.defer(
					(function(e) {
						return function(ctx){
							e.draw(ctx);
						};
					})(enemies[i]),
					pos.z);
			}
		}

		Ptero.orb.update(dt);
		Ptero.bulletpool.deferBullets();
	}

	function draw(ctx) {
		Ptero.assets.keepExplosionsCached(ctx);
		Ptero.deferredSprites.draw(ctx);

		Ptero.orb.draw(ctx);

		var size = Ptero.hud.getTextSize('menu_title');
		ctx.font = size + "px SharkParty";
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		var frustum = Ptero.screen.getFrustum();
		var p = Ptero.screen.spaceToScreen({x:0, y:frustum.nearTop/4*3, z:frustum.near});
		var x = p.x;
		var y = p.y;
		ctx.fillText("OPTIONS", x,y);

		if (time >= 1) {
			var size = Ptero.hud.getTextSize('menu_option');
			ctx.font = size + "px SharkParty";
			ctx.fillStyle = "#FFF";
			ctx.textBaseline = "middle";
			ctx.textAlign = "center";

			var titles = [
				"High Scores",
				"Credits",
				"Back",
				"Vibration",
			];

			var i;
			for (i=0; i<4; i++) {
				var p = Ptero.screen.spaceToScreen(enemies[i].getPosition());
				var x = p.x;
				var y = p.y;
				var title = titles[i];
				if (i == 3) {
					title += ": ";
					title += vibrate ? "ON" : "OFF";
				}
				ctx.fillText(title,x,y);
			}
		}
	}

	var returnScene;
	var resumeOnReturn;
	function setReturnScene(scene) {
		returnScene = scene;
	}
	function setResumeOnReturn(on) {
		resumeOnReturn = on;
	}

	return {
		init: init,
		update: update,
		draw: draw,
		cleanup:cleanup,
		setReturnScene: setReturnScene,
		setResumeOnReturn: setResumeOnReturn,
		isVibrate: function() { return vibrate; },
	};

})();