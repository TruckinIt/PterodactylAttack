Ptero.Ptalaga.EnemyModelList = function() {
	this.models = [];

	// running count of the number of paths created.
	// used as unique ids to newly created paths
	this.index = 0;

	this.time = 0;
	this.maxTime = 0;
	this.selectedTime = undefined;

	this.isEditing = false;
	this.isPaused = false;
	this.isScrubbing = false;

	this.undoStack = [];
	this.undoStackLength = 0;
	this.undoStackPos = 0;
	this.updateUndoButtons();

	this.preview = false;

	this.setPlaybackSpeed(1);
};

Ptero.Ptalaga.EnemyModelList.prototype = {
	setPlaybackSpeed: function(speed) {
		this.playbackSpeed = speed;
		$('#playback-speed-label').html(speed+'x');
	},
	togglePreview: function() {
		if (this.isPreview) {
			this.isPreview = false;
			$('#preview-button').removeClass('active');
		}
		else {
			this.isPreview = true;
			$('#preview-button').addClass('active');
		}
	},
	togglePlay: function() {
		if (this.isPaused) {
			this.play();
		}
		else {
			this.pause();
		}
	},
	play: function() {
		this.isEditing = false;
		this.deselectAll();
		this.isPaused = false;
		$('#play-btn').addClass('active');
		$('#pause-btn').removeClass('active');
	},
	pause: function() {
		this.isPaused = true;
		$('#play-btn').removeClass('active');
		$('#pause-btn').addClass('active');
	},
	updateUndoButtons: function() {
		if (this.undoStackPos > 0) {
			$('#undo-button').removeAttr('disabled');
		}
		else {
			$('#undo-button').attr('disabled','disabled');
		}

		if (this.undoStackPos < this.undoStackLength) {
			$('#redo-button').removeAttr('disabled');
		}
		else {
			$('#redo-button').attr('disabled','disabled');
		}
	},
	recordForUndo: function(f) {
		if (this.undoStackPos < this.undoStackLength) {
			this.undoStack.splice(this.undoStackPos);
		}
		this.undoStack.push(f);
		this.undoStackPos++;
		this.undoStackLength = this.undoStackPos;
		this.updateUndoButtons();
	},
	undo: function() {
		if (this.undoStackPos > 0) {
			this.undoStackPos--;
			this.undoStack[this.undoStackPos].undo();
		}
		this.updateUndoButtons();
	},
	redo: function() {
		if (this.undoStackPos < this.undoStackLength) {
			this.undoStack[this.undoStackPos].redo();
			this.undoStackPos++;
		}
		this.updateUndoButtons();
	},
	deselectAll: function() {
		var i,len=this.models.length;
		for (i=0; i<len; i++) {
			this.models[i].selectedIndex = undefined;
		}
	},
	selectSomething: function() {
		var i,len=this.models.length;
		var e;
		for (i=0; i<len; i++) {
			e = this.models[i];
			if (e.selectedIndex == undefined) {
				e.selectedIndex = 0;
			}
		}
	},
	refreshOrder: function() {
		var i,len=this.models.length;
		for (i=0; i<len; i++) {
			this.models[i].order = i;
		}
	},
	refreshMaxTime: function() {
		var i,len=this.models.length;
		var prevMaxTime = this.maxTime;
		this.maxTime = 0;
		for (i=0; i<len; i++) {
			this.maxTime = Math.max(this.maxTime, this.models[i].enemy.path.totalTime);
		}

		// update time pane loop end if loop end time was "attached" to max time.
		var timePane = Ptero.Ptalaga.panes.getTimePane();
		if (timePane) {
			if (prevMaxTime == timePane.loopEndTime) {
				timePane.loopEndTime = this.maxTime;
			}
		}
	},
	setModels: function(models) {

		this.index = 0;
		var i,len=models.length;
		for (i=0; i<len; i++) {
			this.index = Math.max(this.index, models[i].index);
		}

		this.models = models;
		this.select(models[0]);
		this.refreshMaxTime();
		this.refreshOrder();
		this.setTime(0);

		this.isEditing = false;
		this.deselectAll();
	},
	duplicatePath: function() {
		this.index++;
		var state = Ptero.Ptalaga.enemy_model.getState();
		var e = Ptero.Ptalaga.EnemyModel.fromState(state);
		e.index = this.index;
		this.models.push(e);
		this.select(e);
		this.refreshMaxTime();
		this.refreshOrder();
		Ptero.Ptalaga.loader.backup();

		var that = this;
		var index = that.index;
		this.recordForUndo({
			undo: function() {
				that.removeIndex(index);
			},
			redo: function() {
				that.models.push(e);
				that.select(e);
				that.refreshMaxTime();
				that.refreshOrder();
				Ptero.Ptalaga.loader.backup();
			},
		});
	},
	createNew: function(skipUndo) {
		this.index++;
		var e = new Ptero.Ptalaga.EnemyModel(this.index);
		this.models.push(e);
		this.select(e);
		this.refreshMaxTime();
		this.refreshOrder();
		Ptero.Ptalaga.loader.backup();

		if (!skipUndo) {
			var index = this.index;
			var that = this;
			this.recordForUndo({
				undo: function() {
					that.removeIndex(index);
					that.index--;
				},
				redo: function() {
					that.index++;
					that.models.push(e);
					that.select(e);
					that.refreshMaxTime();
					that.refreshOrder();
					Ptero.Ptalaga.loader.backup();
				},
			});
		}
	},
	promptRemoveIndex: function(index) {
		var that = this;
		bootbox.confirm('Are you sure you want to delete "Path '+index+'"?',
			function(result) {
				if (result) {
					var e = that.getModelFromIndex(index);
					that.removeIndex(index);

					that.recordForUndo({
						undo: function() {
							that.models.push(e);
							that.select(e);
							that.refreshMaxTime();
							that.refreshOrder();
							Ptero.Ptalaga.loader.backup();
						},
						redo: function() {
							that.removeIndex(index);
						},
					});
				}
			}
		);
	},
	previewIndex: function(index) {
		this.active_enemy_model = Ptero.Ptalaga.enemy_model;
		Ptero.Ptalaga.enemy_model = this.getModelFromIndex(index);
		this.refreshEnemyAttributeControls();
	},
	unpreviewIndex: function(index) {
		if (this.active_enemy_model) {
			this.select(this.active_enemy_model);
		}
		this.active_enemy_model = undefined;
	},
	getModelFromIndex: function(index) {
		var i,len=this.models.length;
		var e;
		for (i=0; i<len; i++) {
			e = this.models[i];
			if (e.index == index) {
				return e;
			}
		}
		return null;
	},
	selectIndex: function(index) {
		this.select(this.getModelFromIndex(index));
	},
	select: function(model) {
		this.active_enemy_model = model;
		Ptero.Ptalaga.enemy_model = model;
		this.refreshTabs();
		this.refreshEnemyAttributeControls();
	},
	removeIndex: function(index) {
		this.remove(this.getModelFromIndex(index));
	},
	remove: function(model) {
		var i,len=this.models.length;
		var e;
		for (i=0; i<len; i++) {
			e = this.models[i];
			if (e == model) {
				this.models.splice(i,1);
				if (len == 1) {
					this.createNew();
				}
				else {
					this.select(this.models[0]);
				}
				break;
			}
		}
		this.refreshMaxTime();
		this.refreshOrder();
		Ptero.Ptalaga.loader.backup();
	},
	toggleAllVisibility: function() {
		var i,len=this.models.length;
		var e;
		var allchecked = true;
		for (i=0; i<len; i++) {
			e = this.models[i];
			if (!e.visible) {
				allchecked = false;
				break;
			}
		}

		var checked = !allchecked;
		for (i=0; i<len; i++) {
			e = this.models[i];
			e.visible = checked;
		}
		this.refreshTabs();
	},
	toggleVisibilityIndex: function(index) {
		var e = this.getModelFromIndex(index);
		e.visible = !e.visible;
	},
	getTabsString: function() {
		var i,e,len=this.models.length;
		var str = "";
		for (i=0; i<len; i++) {
			e = this.models[i];
			if (e == Ptero.Ptalaga.enemy_model) {
				str += '<li class="active"><a href="#">';
			}
			else {
				str += '<li><a href="#" ';
				str += 'onclick="Ptero.Ptalaga.enemy_model_list.selectIndex(' + e.index + ')"';
				str += 'onmouseover="Ptero.Ptalaga.enemy_model_list.previewIndex(' + e.index + ')"';
				str += 'onmouseout="Ptero.Ptalaga.enemy_model_list.unpreviewIndex(' + e.index + ')"';
				str += '>';
			}
			str += '<input ';
			str += 'class="tabcheck" ';
			str += 'type="checkbox" ';
			if (e.visible) {
				str += 'checked ';
			}
			str += 'onchange="Ptero.Ptalaga.enemy_model_list.toggleVisibilityIndex('+e.index+')" ';
			str += '></input>';

			str += '<button class="close" type="button" ';
			str += 'onclick="Ptero.Ptalaga.enemy_model_list.promptRemoveIndex(' +e.index+ ')"';
			str += '>&times;</button>Path ' + e.index + '</a></li>';
		}
		str += '<li><a href="#" onclick="Ptero.Ptalaga.enemy_model_list.createNew()"><i class="icon-plus"></i></li>';
		return str;
	},
	refreshTabs: function() {
		$("#pathtabs").html(this.getTabsString());
	},
	refreshEnemyAttributeControls: function() {
		Ptero.Ptalaga.enemy_model.refreshIsAttack();
		Ptero.Ptalaga.enemy_model.refreshEnemyType();
	},
	update: function(dt) {

		// we pause if we're editing, the pause button is pressed, or scrubbing in time pane.
		if (!this.isEditing && !this.isPaused && !this.isScrubbing) {
			this.time += dt*this.playbackSpeed;
			var timePane = Ptero.Ptalaga.panes.getTimePane();
			this.time = Math.max(this.time, timePane.loopStartTime);
			if (this.time > timePane.loopEndTime) {
				this.time = timePane.loopStartTime;
			}
			this.setTime(this.time);
		}

		var i,len=this.models.length;
		var e;
		for (i=0; i<len; i++) {
			var e = this.models[i];
			e.update(dt);
		}
	},
	setTime: function(t) {
		this.time = t;
		var i,len=this.models.length;
		for (i=0; i<len; i++) {
			this.models[i].enemy.path.setTime(t);
		}
	},
};

Ptero.Ptalaga.EnemyModel = function(index) {
	this.visible = true;
	this.index = index;
	this.enemy = new Ptero.Enemy();
	this.points = [];
	this.delta_times = [];
	this.times = [];
	this.nodeSprites = [];
	this.makeDefaultPath(2);
};

Ptero.Ptalaga.EnemyModel.fromState = function(state) {
	var model = new Ptero.Ptalaga.EnemyModel(state.index);
	model.points = state.points;
	model.setType(state.enemyType || "baby");
	model.setIsAttack(state.isAttack);

	var i,len = model.points.length;
	model.nodeSprites = [];
	model.times = [];
	for (i=0; i<len; i++) {
		model.times[i] = model.points[i].t;
		model.nodeSprites[i] = model.enemy.makeAnimSprite();
	}

	model.refreshTimes();
	model.refreshPath();

	return model;
};

Ptero.Ptalaga.EnemyModel.prototype = {
	refreshIsAttack: function() {
		if (this.isAttack) {
			$('#enemy-is-attack').addClass('active');
		}
		else {
			$('#enemy-is-attack').removeClass('active');
		}
	},
	toggleIsAttack: function() {
		this.setIsAttack(!this.isAttack);
	},
	setIsAttack: function(isAttack) {
		this.isAttack = isAttack;
		Ptero.Ptalaga.loader.backup();
		this.refreshIsAttack();
	},
	refreshEnemyType: function() {
		$('#enemy-type-label').html(this.enemy.typeName);
	},
	setType: function(type) {
		this.enemy.setType(type);

		var i,len=this.nodeSprites.length;
		for (i=0; i<len; i++) {
			this.nodeSprites[i] = this.enemy.makeAnimSprite();
		}
		this.refreshEnemyType();
		Ptero.Ptalaga.loader.backup();
	},
	getState: function() {
		var points = [];
		var i,len = this.points.length;
		var p;
		for (i=0; i<len; i++) {
			p = this.points[i];
			points.push({
				t: p.t,
				x: p.x,
				y: p.y,
				z: p.z,
				angle: p.angle,
			});
		}
		return {
			index: this.index,
			isAttack: this.isAttack,
			enemyType: this.enemy.typeName,
			points: points,
		};
	},
	makeDefaultPath: function(numPoints) {
		var frustum = Ptero.frustum;
		var near = frustum.near;
		var far = frustum.far;
		var dist = far-near;
		var i;
		var sprite;
		for (i=0; i<numPoints; i++) {
			this.points[i] = {
				x:0,
				y:0,
				z:far - i/(numPoints-1)*dist,
				angle: 0,
			};
			sprite = this.enemy.makeAnimSprite();
			this.nodeSprites[i] = sprite;
		}
		var t = 0;
		for (i=0; i<numPoints; i++) {
			this.times[i] = t;
			t += 3.0;
		}
		this.refreshTimes();
		this.initPath();
	},
	initPath: function() {
		this.interp = this.makeInterp();
		//this.enemy.path = new Ptero.Path(this.interp, true);
		this.enemy.path = new Ptero.Path(this.interp);
		Ptero.Ptalaga.enemy_model_list.refreshMaxTime();

		Ptero.Ptalaga.loader.backup();
	},
	refreshPath: function() {
		var t = this.enemy.path.time;
		this.initPath();
		this.enemy.path.setTime(t);
	},
	makeInterp: function() {
		return Ptero.makeHermiteInterpForObjs(
			this.points,
			['x','y','z','angle'],
			this.delta_times
		);
	},
	removePoint: function(index, skipUndo) {
		var len = this.points.length;
		if (index == 0 || !(index > 0 && index < len) || len <= 2) {
			return;
		}
		var p = this.points.splice(index,1)[0];
		this.times.splice(index,1);
		var sprite = this.nodeSprites.splice(index,1)[0];

		this.selectPoint(index-1);

		this.refreshTimes();
		this.refreshPath();

		if (!skipUndo) {
			var that = this;
			Ptero.Ptalaga.enemy_model_list.recordForUndo({
				model: Ptero.Ptalaga.enemy_model,
				undo: function() {
					that.times.push(p.t);
					that.points.push(p);
					that.nodeSprites.push(sprite);
					that.refreshTimes();
					that.refreshPath();
					that.selectPoint(index);
				},
				redo: function() {
					that.points.splice(index,1);
					that.times.splice(index,1);
					that.nodeSprites.splice(index,1);
					that.refreshTimes();
					that.refreshPath();
					that.selectPoint(index-1);
				},
			});
		}

	},

	removeSelectedPoint: function() {
		this.removePoint(this.selectedIndex);
	},

	insertPoint: function() {
		if (this.selectedIndex != null) {
			return;
		}
		var len = this.points.length;

		var path = this.enemy.path;
		var p = path.pos;
		var t = path.time;
		if (!p) {
			p = Ptero.frustum.getRandomPoint();
			t = Ptero.Ptalaga.enemy_model_list.time;
		}
		else {
			p = p.copy();

			// prevent insert point directly at the time of another point.
			var i;
			for (i=0; i<len; i++) {
				if (this.times[i] == t) {
					return;
				}
			}
		}

		p.angle = 0;
		this.times.push(t);
		p.t = this.times[len];
		this.points.push(p);
		var sprite = this.enemy.makeAnimSprite();
		this.nodeSprites.push(sprite);

		this.selectPoint(len);

		var that = this;
		Ptero.Ptalaga.enemy_model_list.recordForUndo({
			model: Ptero.Ptalaga.enemy_model,
			undo: function() {
				var i;
				for (i=0; i<=len; i++) {
					if (that.points[i] == p) {
						that.removePoint(i);
						break;
					}
				}
			},
			redo: function() {
				that.times.push(p.t);
				that.points.push(p);
				that.nodeSprites.push(sprite);
				that.selectPoint(len);
				that.refreshTimes();
				that.refreshPath();
			},
		});

		this.refreshTimes();
		this.refreshPath();
	},

	addPoint: function() {
		var len = this.points.length;
		var p = Ptero.frustum.getRandomPoint();
		p.angle = 0;
		this.times.push(this.times[len-1] + 1.0);
		p.t = this.times[len];
		this.points.push(p);
		var sprite = this.enemy.makeAnimSprite();
		this.nodeSprites.push(sprite);

		this.selectPoint(len);

		var that = this;
		Ptero.Ptalaga.enemy_model_list.recordForUndo({
			model: Ptero.Ptalaga.enemy_model,
			undo: function() {
				that.removePoint(len, true);
			},
			redo: function() {
				that.times.push(p.t);
				that.points.push(p);
				that.nodeSprites.push(sprite);
				that.selectPoint(len);
				that.refreshTimes();
				that.refreshPath();
			},
		});

		this.refreshTimes();
		this.refreshPath();
	},

	// Reorder points and compute delta times.
	refreshTimes: function() {
		var prevSelectedPoint = this.getSelectedPoint();

		// We need to sort the points by time, so we attach a 't' variable as a sort key.
		var i,len = this.points.length;
		for (i=0; i<len; i++) {
			this.points[i].t = this.times[i];
		}
		this.points.sort(function(a,b) { return a.t - b.t; });

		// also sort the times.
		this.times.sort(function(a,b) { return a - b; });

		// compute the delta times in the newly sorted list.
		this.delta_times.length = 0;
		this.delta_times[0] = this.times[0];
		for (i=1; i<len; i++) {
			this.delta_times[i] = this.times[i] - this.times[i-1];
		}

		// The selected point may have a different index upon resorting, so find out where it went.
		var selectedPoint = this.getSelectedPoint();
		if (selectedPoint != prevSelectedPoint) {
			for (i=0; i<len;i++) {
				if (this.points[i] == prevSelectedPoint) {
					this.selectedIndex = i;
					break;
				}
			}
		}
	},

	update: function(dt) {
		var isActive = (this == Ptero.Ptalaga.enemy_model);
		this.enemy.sprite.update(dt);

		// PREVIEW MODE
		if (Ptero.Ptalaga.enemy_model_list.isPreview) {

			if (isActive || this.visible) {

				var that = this;
				if (this.enemy.getPosition()) {
					Ptero.deferredSprites.defer(
						(function(e){
							return function(ctx) {
								if (!isActive) {
									//ctx.globalAlpha = 0.5;
								}
								e.draw(ctx);
								if (!isActive) {
									//ctx.globalAlpha = 1;
								}
							};
						})(this.enemy),
						this.enemy.getPosition().z);
				}
			}
		}

		// EDIT MODE
		else {

			// DRAW ALL NODES WHEN ACTIVE
			if (isActive) {
				for (i=0; i<this.nodeSprites.length; i++) {
					if (this.selectedIndex == i) {
						this.nodeSprites[i].update(dt);
					}
					Ptero.deferredSprites.defer(
						(function(sprite,pos,isSelected) {
							return function(ctx){
								if (isSelected) {
									sprite.draw(ctx,pos);
									sprite.drawBorder(ctx,pos,"#F00");
								}
								else {
									var backupAlpha = ctx.globalAlpha;
									ctx.globalAlpha *= 0.7;
									sprite.draw(ctx,pos);
									ctx.globalAlpha = backupAlpha;
								}
							};
						})(this.nodeSprites[i],this.points[i],this.selectedIndex == i),
						this.points[i].z);
				}
				if (this.selectedIndex == null) {
					var pos = this.enemy.getPosition();
					if (pos) {
						Ptero.deferredSprites.defer(
							(function(enemy,sprite,pos) {
								return function(ctx){
									enemy.draw(ctx);
									sprite.drawBorder(ctx,pos,"#00F");
								};
							})(this.enemy,this.enemy.sprite,pos),
							pos.z);
					}
				}
			}

			// WHEN NOT ACTIVE, DRAW SPRITE AT CURRENT TIME
			else if (this.visible) {

				var pos = this.enemy.getPosition();
				if (pos) {
					var that = this;
					Ptero.deferredSprites.defer(
						(function(e){
							return function(ctx) {
								ctx.globalAlpha = 0.35;
								e.draw(ctx);
								ctx.globalAlpha = 1;
							};
						})(this.enemy),
						pos.z);
				}
			}
		}
	},
	selectPoint: function(index) {

		// If we have just deselected a point...
		if (index == undefined && this.selectedIndex != undefined) {

			// just aesthetics: match the replay sprite with the editing node sprite
			this.enemy.sprite.time = this.nodeSprites[this.selectedIndex].time;
		}

		this.selectedIndex = index;

		// Set editing mode depending on whether we are selecting or deselecting.
		Ptero.Ptalaga.enemy_model_list.isEditing = (index != undefined);

		// Set the current time at the selected node.
		if (index != undefined) {
			Ptero.Ptalaga.enemy_model_list.setTime(this.points[this.selectedIndex].t);
			Ptero.Ptalaga.enemy_model_list.selectSomething();
		}
		else {
			Ptero.Ptalaga.enemy_model_list.deselectAll();
		}
	},

	getSelectedPoint: function() {
		return this.points[this.selectedIndex];
	},

	getSelectedNodeSprite: function() {
		return this.nodeSprites[this.selectedIndex];
	},
};
