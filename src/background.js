
Ptero.background = (function(){

	var bgLayers,bgLayersDesat,bgLayersWash,bgBlur;
	var bgFlat;
	var grassAnim;
	var scale;
	var layerPositions = [];
	var layerCollisions = [];
	var selectedLayer = null;

	var parallaxOffset = 0;


	var wash = false;

	return {
		setWash: function(on) {
			wash = on;
		},
		getSelectedLayer: function() {
			return selectedLayer;
		},
		getLayerCollisions: function() {
			return layerCollisions;
		},
		getLayerCollisionStates: function() {
			var result = [];
			var i,len=layerCollisions.length;
			for (i=0; i<len; i++) {
				var shape_states = [];
				var shapeGroup = layerCollisions[i];
				if (shapeGroup) {
					var j,numShapes = shapeGroup.length;
					for (j=0; j<numShapes; j++) {
						var shape = shapeGroup[j];
						shape_states.push(shape.getState());
					}
				}
				result.push(shape_states);
			}
			return result;
		},
		setLayerCollisionStates: function(result) {
			layerCollisions.length = 0;
			if (!result) {
				return;
			}

			var i,len=result.length;
			for (i=0; i<len; i++) {
				var shapeGroup = result[i];
				var j,numShapes = shapeGroup.length;
				var shapes = [];
				var depth = layerPositions[i].z;
				for (j=0; j<numShapes; j++) {
					var shapeState = shapeGroup[j];
					var shape = Ptero.CollisionShape.fromState(shapeState)
					shape.projectToZ(depth);
					shapes.push(shape);
				}
				layerCollisions.push(shapes);
			}
		},
		removeLayerCollisionShape: function(shape) {
			var shapes = layerCollisions[selectedLayer];
			if (shapes) {
				var index = shapes.indexOf(shape);
				if (index != null) {
					shapes.splice(index,1);
				}
			}
		},
		addLayerCollisionShape: function(shape) {
			if (selectedLayer != null) {
				if (!layerCollisions[selectedLayer]) {
					layerCollisions[selectedLayer] = [shape];
				}
				else {
					layerCollisions[selectedLayer].push(shape);
				}
			}
		},
		getCurrentLayerCollisionShapes: function() {
			return layerCollisions[selectedLayer];
		},
		setSelectedLayer: function(i) {
			selectedLayer = i;
		},
		getNumLayers: function() {
			return numLayers;
		},
		getLayerDepth: function(i) {
			return layerPositions[i].z;
		},
		getLayerDepths: function() {
			var depths = [];
			var i,len=layerPositions.length;
			for (i=0; i<len; i++) {
				depths.push(layerPositions[i].z);
			}
			return depths;
		},
		setLayerDepths: function(depths) {
			var i,len=depths.length;
			numLayers = len;
			for (i=0; i<len; i++) {
				this.setLayerDepth(i, depths[i]);
			}
		},
		getLayerSpaceRects: function(i) {
			var pos = layerPositions[i];
			if (i == 1) {
				var a = bgLayers.getFrameSpaceRects(pos, "bg1_0");
				var b = bgLayers.getFrameSpaceRects(pos, "bg1_1");
				a.push.apply(a,b);
				return a;
			}
			else {
				return bgLayers.getFrameSpaceRects(pos, "bg"+i);
			}
		},
		setLayerDepth: function(i,z) {
			layerPositions[i].z = z;
			var near = Ptero.screen.getFrustum().near;
			var scale = 1/near*z;
			if (i==1) {
				bgLayers.billboards["bg1_0"].scale = scale;
				bgLayers.billboards["bg1_1"].scale = scale;
				bgLayersDesat.billboards["bg1_0"].scale = scale;
				bgLayersDesat.billboards["bg1_1"].scale = scale;
				bgLayersWash.billboards["bg1_0"].scale = scale;
				bgLayersWash.billboards["bg1_1"].scale = scale;
				
				var names = grassAnim.mosaic.frame_names;
				var j,len = names.length;
				for (j=0; j<len; j++) {
					grassAnim.mosaic.billboards[names[j]].scale = scale;
				}
			}
			else {
				bgLayers.billboards["bg"+i].scale = scale;
				bgLayersDesat.billboards["bg"+i].scale = scale;
				bgLayersWash.billboards["bg"+i].scale = scale;
			}
		},
		init: function() {
			var w = 1280;
			var h = 720;
			var aspect = w/h;
			var scaleH = Ptero.screen.getHeight() / h;
			var scaleW = Ptero.screen.getWidth() / w;
			scale = (aspect > Ptero.screen.getAspect()) ? scaleH : scaleW;
			bgFlat = Ptero.assets.sprites["desert"];
			bgLayers = Ptero.assets.mosaics["bgLayers"];
			bgLayersDesat = Ptero.assets.mosaics["bgLayersDesat"];
			bgLayersWash = Ptero.assets.mosaics["bgLayersWash"];
			bgBlur = Ptero.assets.sprites["bg_frosted"];
			grassAnim = new Ptero.AnimSprite({mosaic: Ptero.assets.mosaics.grass});

			var far = Ptero.screen.getFrustum().far;
			var near = Ptero.screen.getFrustum().near;
			var zlen = far-near;
			var step = zlen/5;
			layerPositions = [];
			var i;
			for (i=0; i<6; i++) {
				layerPositions[i] = {x:0,y:0};
				this.setLayerDepth(i, far-step*(5-i));
			}

			var savedDepths = Ptero.assets.json["bgLayerDepths"];
			if (savedDepths) {
				this.setLayerDepths(savedDepths.depths);
				this.setLayerCollisionStates(savedDepths.collisions);
			}

			window.addEventListener("deviceorientation", function(orientData) {
				parallaxOffset = orientData.beta/500;
			}, true);
		},

		getScale: function getScale() { return scale; },
		update: function(dt) {
			grassAnim.update(dt);
			for (i=0; i<6; i++) {
				var layer = "bg"+i;
				var _pos = layerPositions[i];
				var pos = {
					x: _pos.x + parallaxOffset,
					y: _pos.y,
					z: _pos.z,
				};
				var desat = (selectedLayer != null && selectedLayer != i);
				if (i == 1) {
					Ptero.deferredSprites.defer(
						(function(pos,desat){
							return function(ctx) {
								var alpha = ctx.globalAlpha;
								ctx.globalAlpha = 1;
								if (wash) {
									bgLayersWash.draw(ctx, pos,"bg1_1");
									bgLayersWash.draw(ctx, pos,"bg1_0");
								}
								else if (desat) {
									bgLayersDesat.draw(ctx, pos,"bg1_1");
									bgLayersDesat.draw(ctx, pos,"bg1_0");
								}
								else {
									bgLayers.draw(ctx, pos,"bg1_1");
									grassAnim.draw(ctx,pos);
									bgLayers.draw(ctx, pos,"bg1_0");
								}
								ctx.globalAlpha = alpha;
							};
						})(pos,desat), pos.z);
				}
				else {
					Ptero.deferredSprites.defer(
						(function(pos,layer,desat){
							return function(ctx) {
								var alpha = ctx.globalAlpha;
								ctx.globalAlpha = 1;
								if (wash) {
									bgLayersWash.draw(ctx, pos, layer);
								}
								else if (desat) {
									bgLayersDesat.draw(ctx, pos, layer);
								}
								else {
									bgLayers.draw(ctx, pos, layer);
								}
								ctx.globalAlpha = alpha;
							};
						})(pos,layer,desat), pos.z);
				}
			}
		},
		draw: function draw(ctx) {
			var pos = {
				x: 0,
				y: 0,
				z: Ptero.screen.getFrustum().near,
			};

			if (Ptero.executive.isPaused()) {
				bgBlur.draw(ctx, pos);
			}
			else {
			}
		},
	};
})();
