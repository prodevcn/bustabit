/**
 * The code that renders the canvas.
 */

define([
    'react',
    'react-dom',
    'game-logic/clib',
    'game-logic/stateLib',
    'lodash',
    'game-logic/GameEngineStore'
], function(
    React,
    ReactDOM,
    Clib,
    StateLib,
    _,
    Engine
) {
    var D = React.DOM;
// init

    // Styling
    function style(theme, width) {
      function combineTheme(obj) {
        if (typeof obj[theme] === 'string')
          return obj[theme];
        else
          return _.assign({}, obj.base, obj[theme]);
      }

      function combineState(obj) {
        // Possible states and their inheritance graph. All derive also from base.
        var states = {
          playing: [],
          cashed: [],
          lost: [],
          starting: [],
          startingBetting: ['starting', 'playing'],
          progress: [],
          progressPlaying: ['progress', 'playing'],
          progressCashed: ['progress', 'cashed'],
          ended: [],
          endedCashed: ['ended', 'cashed']
        };

        return _.mapValues(states, function(sups, state) {
          var res = _.assign({}, obj.base || {});
          _.forEach(sups, function(sup) {
            _.assign(res, obj[sup] || {});
          });
          _.assign(res, obj[state]);
          return res;
        });
      }

      // Multiply one percent of canvas width x times
      function fontSizeNum(times) {
        return times * width / 100;
      }

      // Return the font size in pixels of one percent
      // of the width canvas by x times.
      function fontSizePx(times) {
        var fontSize = fontSizeNum(times);
        return fontSize.toFixed(2) + 'px';
      }

      var strokeStyle = combineTheme({
        white: 'Black',
        black: '#2db1e2'
      });

      var fillStyle = combineTheme({
        white: 'black',
        black: '#b0b3c1'
      });

      return {
        fontSizeNum: fontSizeNum,
        fontSizePx: fontSizePx,
        graph: combineState({
          base: {
            lineWidth: 4,
            strokeStyle: strokeStyle
          },
          playing: {
            lineWidth: 6,
            strokeStyle: '#2db1e2'
          },
          cashed: {
            /* strokeStyle = "Grey", */
            strokeStyle: '#f00',
            lineWidth: 6
          }
        }),
        axis: {
          lineWidth: 1,
          font: '12px Verdana',
          textAlign: 'center',
          strokeStyle: 'rgba(255, 255, 255, .1)',
          fillStyle: fillStyle,
        },
        data: combineState({
          base: {
            textAlign: 'center',
            textBaseline: 'middle'
          },
          starting: {
            font: fontSizePx(5) + ' Verdana',
            fillStyle: '#2db1e2'
          },
          progress: {
            font: fontSizePx(10) + ' Verdana',
            fillStyle: 'white'
          },
          progressPlaying: {
            fillStyle: '#2db1e2'
          },
          ended: {
            font: fontSizePx(10) + ' Verdana',
            fillStyle: 'red'
          },
          banner: {
            font: fontSizePx(6) + ' Verdana',
            fillStyle: '#ff8100'
          }
        })
      };
    }

    var XTICK_LABEL_OFFSET = 20;
    var XTICK_MARK_LENGTH = 5;
    var YTICK_LABEL_OFFSET = 11;
    var YTICK_MARK_LENGTH = 5;

    // Measure the em-Height by CSS hackery as height text measurement is not
    // available on most browsers. From:
    //   https://galacticmilk.com/journal/2011/01/html5-typographic-metrics/#measure
    function getEmHeight(font) {
        var sp = document.createElement("span");
        sp.style.font = font;
        sp.style.display = "inline";
        sp.textContent = "Hello world!";

        document.body.appendChild(sp);
        var emHeight = sp.offsetHeight;
        document.body.removeChild(sp);
        return emHeight;
    }

    // Function to calculate the distance in semantic values between ticks. The
    // parameter s is the minimum tick separation and the function produces a
    // prettier value.
    function tickSeparation(s) {
        var r = 1;
        while (true) {
            if (r > s) return r;
            r *= 2;

            if (r > s) return r;
            r *= 5;
        }
    }
    function tickSeparationY(s) {
      var r= 1;
      while ( true) {
        if (r > s) return r;
            r *= 5;
      }
    }

    function Graph() {
      this.canvas      = null;
      this.ctx         = null;
      this.animRequest = null;
      this.renderBound = this.render.bind(this);
      this.prevText = "";
      this.mousePos = {
          x: 400,
          y: 300
      };

    // create canvas
      this.particles = [];
      this.rockets = [];
      this.MAX_PARTICLES = 400;
      this.colorCode = 0;  
    }

    Graph.prototype.startRendering = function(canvasNode, config) {
        console.assert(!this.ctx && !this.ctx);

        if (!canvasNode.getContext)
            return console.error('No canvas');

        this.ctx = canvasNode.getContext('2d');
        this.canvas = canvasNode;
        this.configPlotSettings(config, true);

        this.animRequest = window.requestAnimationFrame(this.renderBound);
    };

    Graph.prototype.stopRendering = function() {
        window.cancelAnimationFrame(this.animRequest);
        this.canvas = this.ctx = null;
    };

    Graph.prototype.configPlotSettings = function(config, forceUpdate) {
        // From: http://www.html5rocks.com/en/tutorials/canvas/hidpi/
        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio =
            this.ctx.webkitBackingStorePixelRatio ||
            this.ctx.mozBackingStorePixelRatio ||
            this.ctx.msBackingStorePixelRatio ||
            this.ctx.oBackingStorePixelRatio ||
            this.ctx.backingStorePixelRatio || 1;
        var ratio = devicePixelRatio / backingStoreRatio;

        // Only update these settings if they really changed to avoid rendering hiccups.
        if (this.canvasWidth !== config.width ||
            this.canvasHeight !== config.height ||
            this.devicePixelRatio !== devicePixelRatio ||
            this.backingStoreRatio !== backingStoreRatio ||
            forceUpdate
        ) {
            this.canvasWidth = config.width;
            this.canvasHeight = config.height;
            this.devicePixelRatio = devicePixelRatio;
            this.backingStoreRatio = backingStoreRatio;

            // Use CSS to *always* get the correct canvas geometry.
            this.canvas.style.width = config.width + 'px';
            this.canvas.style.height = config.height + 'px';

            // Scale the canvas element by ratio to account for HiDPI.
            this.canvas.width = config.width * ratio;
            this.canvas.height = config.height * ratio;
        }

        // Transform the entire scene to make the HiDPI scaling transparent.
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.style = style(config.currentTheme, this.canvasWidth);

        // The minimum separation of ticks in pixels.
        this.xMinTickSeparation = 2 * this.ctx.measureText("10000").width;
        this.yMinTickSeparation = getEmHeight(this.style.axis.font) *
          (config.controlsSize === 'small'? 1.75 : 4);

        /* Geometry of the canvas. This are physical measures in pixels. The
           origin O is at the upper left corner and the y-axis is pointing down.

                    x
                O   ↦      ├╌╌╌╌╌╌plotwidth╌╌╌╌╌╌┤
                  ╭──────────────────────────────────╮           ┬
              y ↧ │                                  │           ╎
                  │        │                         │   ┬       ╎
                  │        │                         │   ╎       ╎
                  │        │                         │  plot     ╎
                  │        │                         │ height  canvas
                  │        │                         │   ╎     height
              ┬   │   ─────┼──────────────────────   │   ┴       ╎
              ╎   │        │                         │           ╎
           ystart │        │                         │           ╎
              ╎   │                                  │           ╎
              ┴   ╰──────────────────────────────────╯           ┴
                  ├╌xstart╌┤
        */
        this.xStart = 10;
        this.yStart = 50;
        this.plotWidth = this.canvasWidth - this.xStart - 50;
        this.plotHeight = this.canvasHeight - this.yStart - 70;

        /* Geometry of the graph. This are semantic measures. On the x-Axis this
           is the time in ms since game start and the multiplier on the y-Axis.

                  ╭──────────────────────────────────╮
                  │                                  │
                  │        │                         │   ╦  <--- payout end
                  │        │                         │   ║
                  │        │                         │ payout
                  │        │                         │   ║
                  │    p ↥ │                         │   ║
                  │   ─────┼──────────────────────   │   ╩  <--- payout beg
                  │      O │ ↦                       │
                  │        │ t                       │
                  │                                  │
                  ╰──────────────────────────────────╯
                           ╠═══════ time ════════╣
        */
        // Minimum of 10 Seconds on x-Axis.
        this.XTimeMinValue = 10000;
        // Minimum multiplier of 2.00x on y-Axis.
        this.YPayoutMinValue = 300;

        this.showText = 1;
        let mThis = this;
        this.timer = setInterval(function() {
          //console.log('Timer : ', mThis.timer);
          if (Engine.gameState == 'jackpot_run_starting') return;
          if(mThis.showText == 0 ) {
            mThis.showText = 1;
          } else {
            mThis.showText = 0;
          } 
        }, 2000);

    };

    Graph.prototype.calculatePlotValues = function() {
        // TODO: Use getGamePayout from engine.
        this.currentTime = Clib.getElapsedTimeWithLag(Engine);
        this.currentGrowth = 100 * Clib.growthFunc(this.currentTime);
        this.currentPayout = 100 * Clib.calcGamePayout(this.currentTime);

        // Plot variables
        this.XTimeBeg = 0;
        this.XTimeEnd = Math.max(this.XTimeMinValue, this.currentTime);
        this.YPayoutBeg = 100;
        this.YPayoutEnd = Math.max(this.YPayoutMinValue, this.currentGrowth);

        // Translation between semantic and physical measures.
        this.XScale = this.plotWidth / (this.XTimeEnd - this.XTimeBeg);
        this.YScale = this.plotHeight / (this.YPayoutEnd - this.YPayoutBeg);
    };

    // Best would be to add this to the transformation matrix, but that
    // transforms text entirely too. D'oh.
    Graph.prototype.trX = function(t) {
        return this.XScale * (t - this.XTimeBeg);
    };

    Graph.prototype.trY = function(p) {
        return - (this.YScale * (p - this.YPayoutBeg));
    };

    Graph.prototype.render = function() {
        this.calculatePlotValues();
        this.clean();

        // Translate to the graph origin.
        this.ctx.save();
        this.ctx.translate(this.xStart, this.canvasHeight - this.yStart);
        if (Engine.gameState !== 'jackpot_run_starting') {
          this.drawAxes();
          this.drawGraph();
        } else {
          var ctx = this.ctx;
          _.assign(ctx, this.style.axis);
          this.ctx.fillStyle = "#26222b";
          this.ctx.fillRect(-10, -(this.plotHeight+70), this.canvasWidth, 60);
        }
        this.ctx.restore();
        
        // Render the game data untranslated.
        this.drawGameData();

        this.animRequest = window.requestAnimationFrame(this.renderBound);
    };

    Graph.prototype.clean = function() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    };

    Graph.prototype.drawGraph = function() {
        var style = this.style.graph;
        var ctx = this.ctx;
        
        // Style the line depending on the game state.
        _.assign(ctx,
          // Playing and not cashed out
          StateLib.currentlyPlaying(Engine) ? style.playing :
          // Cashing out
          Engine.cashingOut ? style.cashed :
          // Otherwise
          style.progress
        );

        var tstep =
              this.YPayoutEnd < 1000 ?
              // For < 10.00x step 100ms.
              100 :
              // After 10.00x the graph is pretty smooth. Make sure
              // that we move at least two pixels horizontally.
              Math.max(100, Math.floor(2 / this.XScale));

        ctx.beginPath();
        for (var t = this.XTimeBeg; t < this.currentTime; t += tstep) {
            var x = this.trX(t);
            var y = this.trY(100 * Clib.calcGamePayout(t));
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    };

    Graph.prototype.drawAxes = function() {
        var ctx = this.ctx;
        _.assign(ctx, this.style.axis);

        // Calculate separation values.
        var payoutSeparation = tickSeparation(this.yMinTickSeparation / this.YScale)/2;
        var timeSeparation = tickSeparation(this.xMinTickSeparation / this.XScale);

        // Draw tick marks and axes.
        var x, y, payout, time;
        ctx.beginPath();

        // Draw Payout tick marks.
        payout = this.YPayoutBeg + payoutSeparation;
        for (; payout < this.YPayoutEnd; payout += payoutSeparation) {
            y = this.trY(payout);
            ctx.moveTo(this.trX(this.XTimeEnd), y);
            // ctx.lineTo(this.trX(this.XTimeEnd) - XTICK_MARK_LENGTH, y);
            ctx.lineTo(this.trX(this.XTimeBeg), y);
        }

        // Draw time tick marks.
        time = timeSeparation;
        for (; time < this.XTimeEnd; time += timeSeparation) {
            x = this.trX(time);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.trY(this.YPayoutEnd));
        }

        // Draw background axes
        var x0 = this.trX(this.XTimeBeg), x1 = this.trX(this.XTimeEnd),
            y0 = this.trY(this.YPayoutBeg), y1 = this.trY(this.YPayoutEnd);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1, y0);
        ctx.lineTo(x0, y0);
        ctx.lineTo(x0, y1);
        ctx.lineTo(x1, y1);

        // Finish drawing tick marks and axes.
        ctx.stroke();
        
        // Draw payout tick labels.
        payout = this.YPayoutBeg + payoutSeparation;
        // ctx.moveTo(this.trX(this.XTimeEnd)+XTICK_LABEL_OFFSET, y)
        // ctx.rotate(-Math.PI/10);
        // context.save();
//  context.translate(newx, newy);
//  context.rotate(-Math.PI/2);
//  context.textAlign = "center";
//  context.fillText("Your Label Here", labelXposition, 0);
//  context.restore();
        for (; payout < this.YPayoutEnd; payout += payoutSeparation) {
          y = this.trY(payout);
            ctx.save();
            ctx.translate(this.trX(this.XTimeEnd)+XTICK_LABEL_OFFSET , y);
            ctx.rotate(-Math.PI/10);
                        
            ctx.fillText((payout / 100).toFixed(2) + 'x', 0, 0);
            ctx.restore();
            
        }
        // ctx.moveTo(x1, y1);
        // ctx.rotate(Math.PI/10);

        // Draw time tick labels.
        
        time = 0;
        for (; time < this.XTimeEnd; time += timeSeparation) {
            x = this.trX(time);
            ctx.fillText((time / 1000) + 's', x, YTICK_LABEL_OFFSET);
        }
        ctx.fillStyle = "#26222b";
        ctx.fillRect(-10, -(this.plotHeight+70), this.canvasWidth, 60);
        
    };

    Graph.prototype.repaint = function(anglets) {      
      let jackPotList = Engine.jackpotCustomData.list;
      console.log(jackPotList)
      let anglet = anglets / 180.0 * Math.PI;
      var angle = Math.PI * 2 / jackPotList.length;
      let ctx = this.ctx;    
      ctx.beginPath();
      ctx.moveTo(this.canvasWidth / 2, self.jackpotPosition + 15);
      ctx.lineTo(this.canvasWidth / 2 - 20, self.jackpotPosition);
      ctx.lineTo(this.canvasWidth / 2 + 20, self.jackpotPosition);
      ctx.fillStyle = 'yellow';
      ctx.fill();
      let r = (this.canvasHeight - 80);
      for (let i = 0; i < jackPotList.length; i++) {       
  
        // Start a new path
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        // Go to center of the Chart
        ctx.moveTo(this.canvasWidth / 2, this.canvasHeight + 20);
        
        // Draw an Arc
        // arc(centerX, centerY, radius, angleStart, angleEnd)
        ctx.arc(this.canvasWidth / 2, this.canvasHeight + 20, r, anglet + angle * i, anglet + angle * (i + 1));
        let colors = jackPotList[i].color.split(',');
        if (colors.length == 1)
          ctx.fillStyle = jackPotList[i].color;
        else {
          var grd = ctx.createLinearGradient(this.canvasWidth / 2, this.canvasHeight + 20, this.canvasWidth / 2 + Math.cos(anglet + angle * i) * r, this.canvasHeight + 20 + + Math.sin(anglet + angle * i) * r);
          grd.addColorStop(0, colors[0]);
          grd.addColorStop(1, colors[1]);
          ctx.fillStyle = grd;
        }
        // Draw a line to close the pie slice
        ctx.lineTo(this.canvasWidth / 2, this.canvasHeight + 20);
        
        // Print the path
        ctx.stroke();
        ctx.fill();
      }
      for (let i = 0; i < jackPotList.length; i++) {       
        ctx.save();
        ctx.font = "20px Georgia bold";
        
        ctx.translate(this.canvasWidth / 2 + (r - 20) * Math.cos(anglet + angle * (i + 0.5)), this.canvasHeight + 20 + (r - 20) * Math.sin(anglet + angle * (i + 0.5)));
        ctx.rotate(angle * (i + 0.5) + anglet);
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.strokeWidth = 1;
        ctx.fillWidth = 2;
        ctx.textAlign = 'right';
        ctx.fillText(jackPotList[i].text, 0, 0);
        ctx.restore();
      }
    }

    Graph.prototype.drawGameData = function() {
      const firstPeek = 1.5, secondPeek = 5, thirdPeek = 10;
      var style = this.style.data;
      var ctx = this.ctx;
      var text_color = "#ff8100";
      
      var letter ="WELCOME TO SONICXROCKET";

      //console.log(this.showText);
        
      var otherTextVisibility = '';

      switch (Engine.gameState) {
      case 'STARTING':
        if (self.jackpotArrowAnimationTimer) {
          clearInterval(self.jackpotArrowAnimationTimer);
          self.jackpotArrowAnimationTimer = null;
        }
        if (self.launchTimer) {
          clearInterval(self.loopTimer);
          clearInterval(self.launchTimer);
          self.launchTimer = self.loopTimer = null;
        }
        var timeLeft = ((Engine.startTime - Date.now()) /1000 ).toFixed(1);
        _.assign(ctx, style.starting);
        ctx.fillStyle="white";
        ctx.fillText(
          'Next Round',
          this.canvasWidth /2,
          (this.canvasHeight / 2) - 40, 
        );
        ctx.fillStyle="#2db1e2";
        ctx.fillText(
          timeLeft + 's',
          this.canvasWidth / 2,
          (this.canvasHeight / 2 + 40)
        );
        // 
        _.assign(ctx, style.end);
        ctx.beginPath();
        ctx.fillStyle="red";
        ctx.arc(this.canvasWidth / 2, (this.canvasHeight/2 + 40), 50, -Math.PI/2,((3* Math.PI)/2 - ((2 * Math.PI)/5)*timeLeft));
        ctx.strokeStyle="#2db1e2";
        ctx.lineWidth="3";
        ctx.stroke();
        // 
        letter = 'GOOD LUCK !';
        document.getElementById('peak1').style.height = "100%";//#####
        document.getElementById('peak2').style.height = "100%";//#####
        document.getElementById('peak3').style.height = "100%";//#####
        document.getElementById('jackpot-wheel1').style.filter = '';
        document.getElementById('jackpot-wheel2').style.filter = '';
        document.getElementById('jackpot-wheel3').style.filter = '';
        break;

      case 'IN_PROGRESS':
        _.assign(ctx, StateLib.currentlyPlaying(Engine) ?
                        style.progressPlaying : style.progress);
        ctx.fillText(
          (this.currentPayout / 100).toFixed(2) + 'x',
          this.canvasWidth / 2,
          this.canvasHeight / 2
        );
        letter = 'ESCAPING EARTH GRAVITY';
        const current_progress = (this.currentPayout / 100); //#####
        (firstPeek - current_progress) <= 0 && (document.getElementById('jackpot-wheel1').style.filter = 'inherit');
        (secondPeek - current_progress) <= 0 && (document.getElementById('jackpot-wheel2').style.filter = 'inherit');
        (thirdPeek - current_progress) <= 0 && (document.getElementById('jackpot-wheel3').style.filter = 'inherit');
        document.getElementById('peak1').style.height = (firstPeek - current_progress) <= 0 ? "0px" : ((firstPeek - current_progress) / firstPeek * 100 + "%");//#####
        document.getElementById('peak2').style.height = (secondPeek - current_progress) <= 0 ? "0px" : ((secondPeek - current_progress) / (secondPeek - firstPeek) * 100 + "%");//#####
        document.getElementById('peak3').style.height = (thirdPeek - current_progress) <= 0 ? "0px" : ((thirdPeek - current_progress) / (thirdPeek - secondPeek) * 100 + "%");//#####
        break;
      case 'jackpot_run_starting': 
        otherTextVisibility = 'none';
        console.log("Status", Engine.jackpotState, Engine.jackpotCustomData);
        switch (Engine.jackpotState) {
          case 1: letter = 'JACKPOT ROUND LAUNCHED'; break;
          case 2: letter = 'ONE LUCKY PLAYER WILL SPIN'; break;
          case 3: letter = 'THE WHEEL'; break;
          case 4: letter = ''; break;
          case 5: letter = 'CHOOSING THE PLAYER IN'; break;
          case 6: letter = '3 SEC'; break;
          case 7: letter = '2 SEC'; break;
          case 8: letter = '1 SEC'; break;
          case 9: letter = '!! GOOD LUCK !!'; break;
          case 11:
            self.jackpotPosition = 65; 
            letter = Engine.jackpotCustomData.names; 
            self.jackpotNameCount = Engine.jackpotCustomData.count;
            if (self.jackpotNameTimer == null) {
              self.jackpotNameOffset = 0;
              self.jackpotNameTimer = setInterval(function() {
                self.jackpotNameOffset -= 1;
              }, 10);
            }              
          break;
          case 12: 
            if (self.jackpotNameTimer != null) {
              clearInterval(self.jackpotNameTimer);
              self.jackpotNameTimer = null;
            }
            letter = self.jackpotNameBlinkingVisibility % 2 ? Engine.jackpotCustomData.names.toUpperCase() : "";
            if (self.jackpotNameBlinkingTimer == null) {
              self.jackpotNameBlinkingVisibility = 0;
              self.jackpotNameBlinkingTimer = setInterval(function() {
                self.jackpotNameBlinkingVisibility++;
              }, 500);
            }
            break;
          case 13:
            if (self.jackpotNameBlinkingTimer != null) {
              clearInterval(self.jackpotNameBlinkingTimer);
              self.jackpotNameBlinkingTimer = null;
            }
            letter = Engine.jackpotCustomData.names.toUpperCase();
            break;
          case 14:            
            self.currentJackpotAngle = 0;
            letter = Engine.jackpotCustomData.names;
            self.jackpotPosition = 65;            
            break;
          default: letter = 'PERFORMING THE JACKPOT';  break;
        }
        break;
      case 'ENDED':
        _.assign(ctx, style.progress);
        // ctx.font="60px Arial";
        // letter = 'CRASHED AT ' + Clib.formatDecimals(lastGame.game_crash / 100, 2) + 'x';
        ctx.fillText(
          'CRASHED', this.canvasWidth / 2,
          this.canvasHeight / 2 - this.style.fontSizeNum(15) / 2
        );
        _.assign(ctx, style.ended);
        var lastGame = Engine.tableHistory[0];
        text_color = '#f00';
        letter = 'CRASHED AT ' + Clib.formatDecimals(lastGame.game_crash / 100, 2) + 'x';
        if (lastGame)
          ctx.fillText(
             + Clib.formatDecimals(lastGame.game_crash / 100, 2) + 'x',
            this.canvasWidth / 2,
            this.canvasHeight / 2 + this.style.fontSizeNum(15) / 2
          );
        break;
      }

      // document.getElementById('max-profit').style.display = document.getElementById('history-bar').style.display = otherTextVisibility;
      var prevText = this.prevText;
      if(this.showText) {        
        ctx.font = "40px Verdana";
        ctx.fillStyle = text_color;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        var textWidth = ctx.measureText(letter).width;
        ctx.shadowBlur = 20;
        ctx.shadowColor = text_color;
        if (!Array.isArray(letter)) 
          ctx.fillText(letter, (this.canvasWidth / 2), 30);
        else {
          let y = 0;
          let offsetY = self.jackpotNameOffset;
          if (self.jackpotNameOffset < 60 - 60 * (self.jackpotNameCount))
            offsetY = self.jackpotNameOffset = 60 - 60 * (self.jackpotNameCount);
          for (let i = 0; i < self.jackpotNameCount; i ++) {
            y = 60 * (i + 1) + offsetY - 30;
            if (y < -50 || y > 150) continue;
            ctx.fillText(letter[i % letter.length].toUpperCase(), (this.canvasWidth / 2), y);
          }          
          ctx.clearRect(0, 60, this.canvasWidth, this.canvasHeight - 60);              
        }
        
        ctx.shadowBlur = 0;
        ctx.shadowColor = "#26222b";
      } else {
        ctx.fillStyle = "#26222b";
        ctx.fillRect(-10, -(this.plotHeight+70), this.canvasWidth, 60);        
      }
      this.prevText = letter;
      if (Engine.gameState == 'jackpot_run_starting') {
        if (Engine.jackpotState == 13) {
          if (!self.currentJackpotAngle) {
            self.currentJackpotAngle = 1;
            self.jackpotAnimationTimer = setInterval(function() {      
              let acc, totalAngle = Engine.jackpotCustomData.destinationAngle;
              if (totalAngle - self.currentJackpotAngle < 5) acc = 0.03;
              else if (totalAngle - self.currentJackpotAngle < 15) acc = 0.04;
              else if (totalAngle - self.currentJackpotAngle < 25) acc = 0.05;            
              else if (totalAngle - self.currentJackpotAngle < 45) acc = 0.07;
              else if (totalAngle - self.currentJackpotAngle < 70) acc = 0.11;            
              else if (totalAngle - self.currentJackpotAngle < 90) acc = 0.12;
              else acc = Math.max(0.15, (totalAngle - self.currentJackpotAngle) / totalAngle);
              self.currentJackpotAngle += acc;
            }, 3);
          }
          if (self.currentJackpotAngle >= Engine.jackpotCustomData.destinationAngle) {
            if (self.jackpotAnimationTimer) {
              clearInterval(self.jackpotAnimationTimer);
              self.jackpotAnimationTimer = null;
            }
            if (!self.jackpotArrowAnimationTimer) {
              self.jackpotPosition = 65;
              self.jackpotArrowAnimationTimer = setInterval(function() {
                self.jackpotPosition ++;
                if (self.jackpotPosition >= 85) {                
                  self.jackpotPosition = 65;
                } 
              }, 50);
            }
            this.repaint(Engine.jackpotCustomData.destinationAngle);
          } else {
            this.repaint(self.currentJackpotAngle);
          }        
        } else if (Engine.jackpotState == 14 && Engine.jackpotCustomData.showGraph)  {          
          this.repaint(Engine.jackpotCustomData.destinationAngle);
          if (!self.launchTimer) {
            this.mousePos.x = this.canvasWidth / 2;
            this.mousePos.y = this.canvasHeight / 2;
            self.launchTimer = setInterval(() => {this.launch()}, 800);
            self.loopTimer = setInterval(() => {this.loop()}, 1000 / 50);
          }
          for (var i = 0; i < this.rockets.length; i++) {
            // update and render
            this.rockets[i].render(this.ctx);
          }

          for (var i = 0; i < this.particles.length; i++) {
              if (this.particles[i].exists()) {
                this.particles[i].render(this.ctx);
              }
          }
        }
      }
    };


    Graph.prototype.launch = function() {
      console.log(this.mousePos);
      this.launchFrom(this.mousePos.x);
    }

    Graph.prototype.launchFrom = function (x) {
        if (this.rockets.length < 10) {
            var rocket = new Rocket(x, this);
            rocket.explosionColor = Math.floor(Math.random() * 360 / 10) * 10;
            rocket.vel.y = Math.random() * -3 - 4;
            rocket.vel.x = Math.random() * 6 - 3;
            rocket.size = 8;
            rocket.shrink = 0.999;
            rocket.gravity = 0.01;
            this.rockets.push(rocket);
        }
    }

    Graph.prototype.loop = function() {        
        var existingRockets = [];

        for (var i = 0; i < this.rockets.length; i++) {
            // update and render
            this.rockets[i].update();
            // this.rockets[i].render(this.ctx);

            // calculate distance with Pythagoras
            var distance = Math.sqrt(Math.pow(this.mousePos.x - this.rockets[i].pos.x, 2) + Math.pow(this.mousePos.y - this.rockets[i].pos.y, 2));

            // random chance of 1% if rockets is above the middle
            var randomChance = this.rockets[i].pos.y < (this.canvasHeight * 2 / 3) ? (Math.random() * 100 <= 1) : false;

    /* Explosion rules
                - 80% of screen
                - going down
                - close to the mouse
                - 1% chance of random explosion
            */
            if (this.rockets[i].pos.y < this.canvasHeight / 5 || this.rockets[i].vel.y >= 0 || distance < 50 || randomChance) {
              this.rockets[i].explode(this);
            } else {
              existingRockets.push(this.rockets[i]);
            }
        }

        this.rockets = existingRockets;

        var existingParticles = [];

        for (var i = 0; i < this.particles.length; i++) {
          this.particles[i].update();

            // render and save particles that can be rendered
            if (this.particles[i].exists()) {
              // this.particles[i].render(this.ctx);
              existingParticles.push(this.particles[i]);
            }
        }

        // update array with existing particles - old particles should be garbage collected
        this.particles = existingParticles;

        while (this.particles.length > 400) {
          this.particles.shift();
        }
    }

    function Particle(pos) {
        this.pos = {
            x: pos ? pos.x : 0,
            y: pos ? pos.y : 0
        };
        this.vel = {
            x: 0,
            y: 0
        };
        this.shrink = .97;
        this.size = 2;

        this.resistance = 1;
        this.gravity = 0;

        this.flick = false;

        this.alpha = 1;
        this.fade = 0;
        this.color = 0;
    }

    Particle.prototype.update = function() {
        // apply resistance
        this.vel.x *= this.resistance;
        this.vel.y *= this.resistance;

        // gravity down
        this.vel.y += this.gravity;

        // update position based on speed
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;

        // shrink
        this.size *= this.shrink;

        // fade out
        this.alpha -= this.fade;
    };

    Particle.prototype.render = function(c) {
        if (!this.exists()) {
            return;
        }

        c.save();

        c.globalCompositeOperation = 'lighter';

        var x = this.pos.x,
            y = this.pos.y,
            r = this.size / 2;
        console.log(x,y,r, c);
        var gradient = c.createRadialGradient(x, y, 0.1, x, y, r);
        gradient.addColorStop(0.1, "rgba(255,255,255," + this.alpha + ")");
        gradient.addColorStop(0.8, "hsla(" + this.color + ", 100%, 50%, " + this.alpha + ")");
        gradient.addColorStop(1, "hsla(" + this.color + ", 100%, 50%, 0.1)");

        c.fillStyle = gradient;

        c.beginPath();
        c.arc(this.pos.x, this.pos.y, this.flick ? Math.random() * this.size : this.size, 0, Math.PI * 2, true);
        c.closePath();
        c.fill();

        c.restore();
    };

    Particle.prototype.exists = function() {
        return this.alpha >= 0.1 && this.size >= 1;
    };

    function Rocket(x,self) {
        Particle.apply(this, [{
            x: x,
            y: self.canvasHeight}]);

        this.explosionColor = 0;
    }

    Rocket.prototype = new Particle();
    Rocket.prototype.constructor = Rocket;

    Rocket.prototype.explode = function(self) {
        var count = Math.random() * 10 + 80;

        for (var i = 0; i < count; i++) {
            var particle = new Particle(this.pos);
            var angle = Math.random() * Math.PI * 2;

            // emulate 3D effect by using cosine and put more particles in the middle
            var speed = Math.cos(Math.random() * Math.PI / 2) * 15;

            particle.vel.x = Math.cos(angle) * speed;
            particle.vel.y = Math.sin(angle) * speed;

            particle.size = 10;

            particle.gravity = 0.2;
            particle.resistance = 0.92;
            particle.shrink = Math.random() * 0.05 + 0.93;

            particle.flick = true;
            particle.color = this.explosionColor;

            self.particles.push(particle);
        }
    };

    Rocket.prototype.render = function(c) {
        if (!this.exists()) {
            return;
        }

        c.save();

        c.globalCompositeOperation = 'lighter';

        var x = this.pos.x,
            y = this.pos.y,
            r = this.size / 2;
        console.log(x,y,r, c);
        var gradient = c.createRadialGradient(x, y, 0.1, x, y, r);
        gradient.addColorStop(0.1, "rgba(255, 255, 255 ," + this.alpha + ")");
        gradient.addColorStop(1, "rgba(0, 0, 0, " + this.alpha + ")");

        c.fillStyle = gradient;

        c.beginPath();
        c.arc(this.pos.x, this.pos.y, this.flick ? Math.random() * this.size / 2 + this.size / 2 : this.size, 0, Math.PI * 2, true);
        c.closePath();
        c.fill();

        c.restore();
    };

    return React.createClass({
        displayName: 'GraphicsDisplay',
        mixins: [React.addons.PureRenderMixin],
        propTypes: {
            controlsSize: React.PropTypes.string.isRequired,
            width: React.PropTypes.number.isRequired,
            height: React.PropTypes.number.isRequired,
            devicePixelRatio: React.PropTypes.number.isRequired,
            currentTheme: React.PropTypes.string.isRequired
        },

        graph: new Graph(),

        componentDidMount: function() {
            this.graph.startRendering(ReactDOM.findDOMNode(this), this.props);
        },

        componentWillUnmount: function() {
            this.graph.stopRendering();
        },

        componentDidUpdate: function() {
            this.graph.configPlotSettings(this.props);
        },

        render: function() {
            // return D.div({className: 'canvas-area'}, 
            //   D.div({className: 'slogan-bar'}),
              return D.canvas();
            // );
        }
    });
});
