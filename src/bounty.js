
Ptero.refreshBounty = function() {
	Ptero.bounty = new Ptero.Bounty();
};

Ptero.Bounty = function() {
	// number of items in the bounty
	this.size = 5;

	// number of different colors
	this.makeColorTable();

	// populate items (i.e. random colors) in the bounty
	var numColors = this.numColors;
	function getRandomColor() {
		return Math.floor(Math.random()*numColors);
	};
	this.items = [];
	this.caught = [];
	var i;
	for (i=0; i<this.size; i++) {
		this.items.push(getRandomColor());
		this.caught.push(false);
	};

	this.cagedEnemies = [];
};

Ptero.Bounty.prototype = {
	makeColorTable: function() {
		// associate color indexes to this stage's particular colors and enemies
		var stage = Ptero.scene_play.getStage();
		if (stage == "mountain") {
			this.colors = [
				'#7EBBED',
				'#BF56F6',
				'#B12432',
				'#24B151',
			];
			this.enemyNames = [
				"baby_mountain_blue",
				"baby_mountain_purple",
				"adult_mountain_red",
				"adult_mountain_green",
			];
		}
		else if (stage == "ice") {
			this.colors = [
				'#BF6EFD',
				'#E8C358',
				'#D13169',
				'#2FB582',
			];
			this.enemyNames = [
				"baby_ice_purple",
				"baby_ice_yellow",
				"adult_ice_red",
				"adult_ice_green",
			];
		}
		else if (stage == "volcano") {
			this.colors = [
				'#60DD84',
				'#9887DB',
				'#1AA4BB',
				'#DC6A0B',
			];
			this.enemyNames = [
				"baby_volcano_green",
				"baby_volcano_purple",
				"adult_volcano_blue",
				"adult_volcano_orange",
			];
		}
		else {
			this.colors = [];
			this.enemyNames = [];
		}
		this.numColors = this.colors.length;
	},
	addEnemy: function(e) {

		// get the color index of the given enemy
		var colorIndex = null;
		var i;
		for (i=0; i<this.numColors; i++) {
			if (e.typeName == this.enemyNames[i]) {
				colorIndex = i;
				break;
			}
		}

		// determine if and where the enemy fits in the remaining items in the bounty
		var itemIndex = null;
		for (i=0; i<this.size; i++) {
			if (!this.caught[i] && colorIndex == this.items[i]) {
				itemIndex = i;
				break;
			}
		}

		// add this enemy to the cage
		this.cagedEnemies.push(e);

		if (itemIndex != null) {
			// caught enemy fits the remaining bounty

			// flag the caught enemy
			this.caught[itemIndex] = true;

			// determine if bounty is complete
			var isComplete = true;
			for (i=0; i<this.size; i++) {
				if (!this.caught[i]) {
					isComplete = false;
					break;
				}
			}

			if (isComplete) {
				// signal bounty completion with sound
				Ptero.audio.playBountyComplete();

				// earn bounty reward
				Ptero.player.earnHealth(1);

				// kill all pteros
				var len = this.cagedEnemies.length;
				for (i=0; i<len; i++) {
					this.cagedEnemies[i].die();
				}

				// create new bounty
				Ptero.refreshBounty();
			}
			else {

				// signal bounty progression with sound
				Ptero.audio.playBountyCorrect();

			}
		}
		else {
			// caught the wrong the ptero

			// signal bad bounty with sound
			Ptero.audio.playBountyWrong();

			// release all caged enemies
			var len = this.cagedEnemies.length;
			for (i=0; i<len; i++) {
				this.cagedEnemies[i].release();
			}

			// create new bounty
			Ptero.refreshBounty();
		}
		
		
	},
	update: function(dt) {
	},
	draw: function(ctx) {
	},
};