define([
    'react',
    'game-logic/clib',
    'game-logic/stateLib',
    'lodash',
    'components/BetButton',
    'actions/ControlsActions',
    'stores/ControlsStore',
    'game-logic/GameEngineStore',
    'components/StrategyEditor',

], function(
    React,
    Clib,
    StateLib,
    _,
    BetButtonClass,
    ControlsActions,
    ControlsStore,
    Engine,
    StrategyEditorClass
){
    function openPanel() {
        document.getElementById('black-bg').style.display='block';
        document.getElementById('control-panel').style.display='block';
    }

    function closePanel() {
        document.getElementById('black-bg').style.display='none';
        document.getElementById('control-panel').style.display='none';
        document.getElementById('strategy-panel').style.display='none';
    }

    function openStrPanel() {
        document.getElementById('black-bg').style.display='block';
        document.getElementById('strategy-panel').style.display='block';
    }

    function closeStrPanel() {
        document.getElementById('black-bg').style.display='none';
        document.getElementById('control-panel').style.display='none';
        document.getElementById('strategy-panel').style.display='none';
    }
    function tabAuto() {
        document.getElementById('auto-cashout').style.display='block';
        document.getElementById('flat-bet').style.display='none';
        document.getElementById('left-tab').style="border-bottom: 2px solid white";
        document.getElementById('right-tab').style="border: none";

    }
    function tabFlat() {
        document.getElementById('auto-cashout').style.display='none';
        document.getElementById('flat-bet').style.display='block';
        document.getElementById('left-tab').style="border: none";
        document.getElementById('right-tab').style="border-bottom: 2px solid white";
        
    }

    var BetButton = React.createFactory(BetButtonClass);

    var D = React.DOM;
    var StrategyEditor = React.createFactory(StrategyEditorClass);
    function getState(){
        return {
            betSize: ControlsStore.getBetSize(), //Bet input string in bits
            betInvalid: ControlsStore.getBetInvalid(), //false || string error message
            cashOut: ControlsStore.getCashOut(),
            cashOutInvalid: ControlsStore.getCashOutInvalid(), //false || string error message
            isPlayingOrBetting:
              StateLib.isBetting(Engine) ||
              (Engine.gameState === 'IN_PROGRESS' && StateLib.currentlyPlaying(Engine)),
            connectionState: Engine.connectionState,
            gameState: Engine.gameState,
            balanceSatoshis: Engine.balanceSatoshis,
            balanceBitsFormatted: Clib.formatSatoshis(Engine.balanceSatoshis),
            placingBet: Engine.placingBet,
            cashingOut: Engine.cashingOut,
            username: Engine.username,
            // balanceSatoshis: Engine.balanceSatoshis,
            notPlaying: StateLib.notPlaying(Engine),
            isBetting: StateLib.isBetting(Engine),
            engine: Engine
        };
    }

    return React.createClass({
        displayName: 'Controls',
        mixins: [React.addons.PureRenderMixin],

        propTypes: {
            isMobileOrSmall: React.PropTypes.bool.isRequired,
            controlsSize: React.PropTypes.string.isRequired
        },

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            ControlsStore.addChangeListener(this._onChange);
            Engine.on({
                joined: this._onChange,
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                player_bet: this._onChange,
                cashed_out: this._onChange,
                placing_bet: this._onChange,
                bet_placed: this._onChange,
                bet_queued: this._onChange,
                cashing_out: this._onChange,
                cancel_bet: this._onChange,
                jackpot_run_starting: this._onChange
            });
        },

        componentWillUnmount: function() {
            ControlsStore.removeChangeListener(this._onChange);
            Engine.off({
                joined: this._onChange,
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                player_bet: this._onChange,
                cashed_out: this._onChange,
                placing_bet: this._onChange,
                bet_placed: this._onChange,
                bet_queued: this._onChange,
                cashing_out: this._onChange,
                cancel_bet: this._onChange,
                jackpot_run_starting: this._onChange
            });
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState(getState());
        },

        _placeBet: function () {
            var bet = StateLib.parseBet(this.state.betSize);
            var cashOut = StateLib.parseCashOut(this.state.cashOut);
            ControlsActions.placeBet(bet, cashOut);
        },

        _cancelBet: function() {
            ControlsActions.cancelBet();
        },

        _cashOut: function() {
            ControlsActions.cashOut();
        },

        _setBetSize: function(betSize) {
            ControlsActions.setBetSize(betSize);
        },

        _setAutoCashOut: function(autoCashOut) {
            ControlsActions.setAutoCashOut(autoCashOut);
        },

        _redirectToLogin: function() {
            window.location = '/login';
        },
        _redirectToRegister: function() {
            window.location = '/register';
        },

        render: function () {
            var self = this;

            //If the game is not connected
            if (self.state.connectionState !== 'JOINED')
                return D.div({ id: 'controls-inner-container' },
                    D.button({ className: 'login-button bet-button' }, '...')
                );

            // If they're not logged in, let just show a login to play
            if (!self.state.username)
                return D.div({ id: 'controls-inner-container' },
                    D.div({className: 'main-container'},
                        D.button({ className: 'login-button bet-button1', onClick: this._redirectToLogin }, 'LOG IN'),
                        D.h1({className: 'letter'}, 'OR'),
                        D.button({ className: 'register-button', onClick: this._redirectToRegister }, 'SIGN UP'),
                    )
                    // D.div({ className: 'register-container'},
                    //     D.a({ className: 'register', href: '/register' }, 'SignUp ')
                    // )
                );

            /** Control Inputs: Bet & AutoCash@  **/
            //var controlInputs = [], betContainer
            var betContainer = D.div({ className: 'bet-container' , key: 'ci-1' },

                D.div({ className: 'bet-input-group' + (this.state.betInvalid? ' error' : '') },
                    D.span({ className: '' }, 'Bet'),
                    D.input({
                        type: 'text',
                        name: 'bet-size',
                        value: self.state.betSize,
                        disabled: self.state.isPlayingOrBetting,
                        onChange: function (e) {
                            self._setBetSize(e.target.value);
                        }
                    }),
                    D.span({ className: '' }, '$USD')
                )
            );
            var autoCashContainer = D.div({ className: 'autocash-container', key: 'ci-2' },

                D.div({ className: 'bet-input-group' + (this.state.cashOutInvalid? ' error' : '') },
                    D.span({ className: '' }, 'Auto Cash Out'),
                    D.input({
                        min: 1,
                        step: 0.01,
                        value: self.state.cashOut,
                        type: 'number',
                        name: 'cash-out',
                        disabled: self.state.isPlayingOrBetting,
                        onChange: function (e) {
                            self._setAutoCashOut(e.target.value);
                        }
                    }),
                    D.span({ className: '' }, 'x')
                )

            );

            var controlInputs;
            var mainContainer;
            if(this.props.isMobileOrSmall || this.props.controlsSize === 'small') {
                controlInputs = D.div({ className: 'control-inputs-container' },
                    D.div({ className: 'input-control' },
                        betContainer
                    ),

                    D.div({ className: 'input-control' },
                        autoCashContainer
                    )
                );
                mainContainer = mainContainer = D.div({className: 'main-container'}, 
                    D.div({className: 'button-group'},
                        D.div({className: 'sonic-btn sonic-001'},
                            D.div({className: 'sonic-btn sonic-002'},
                                D.p({className: 'sonic-btn-tip'}, 'Your Balance ($USD)'),
                                D.p({className: 'sonic-003'}, 
                                    D.span({className: 'sonic-004'}, 
                                        D.span(null,
                                            D.span(null,
                                                D.span(null, this.state.balanceBitsFormatted)
                                            )    
                                        )
                                    )
                                ),
                                D.a({className: 'sonic-005 sonic-btn-2nd', tabIndex: '0', role:'button', href: '/deposit'},
                                    D.span({className: 'sonic-btn-label'},
                                        D.p({className: 'sonic-006'}, 'DEPOSIT')
                                    ),
                                    D.span({className: 'sonic-btn-ripple'})
                                )
                            )
                        ),
                        D.div({className: 'bet-btn bet-001'},
                            D.input({type: 'number', className: 'bet-btn bet-002 input-amount', value:self.state.betSize, onChange: function (e) {
                                self._setBetSize(e.target.value);}}),
                            D.p({className: 'bet-btn-tip'}, 'Your Bet ($USD)'),
                            D.input({type: 'button', className: 'bet-005 bet-btn-2nd', value: 'CHANGE BET', onClick: openPanel})
                        ),
                    ),
                    // D.div({className: 'bet-area'}),
                    D.div({className: 'button-group'}, 
                        D.button({className: 'strategy-btn', onClick: openStrPanel}, 'STRATEGY'),
                        D.div({ className: 'button-container' },
                            BetButton({
                                engine: this.state.engine,
                                placeBet: this._placeBet,
                                cancelBet: this._cancelBet,
                                cashOut: this._cashOut,
                                isMobileOrSmall: this.props.isMobileOrSmall,
                                betSize: this.state.betSize,
                                betInvalid: this.state.betInvalid,
                                cashOutInvalid: this.state.cashOutInvalid,
                                controlsSize: this.props.controlsSize,
                                gameState: this.state.gameState,
                                placingBet: this.state.placingBet,
                                cashingOut: this.state.cashingOut,
                                balanceSatoshis: this.state.balanceSatoshis,
                                notPlaying: this.state.notPlaying,
                                isBetting: this.state.isBetting
                            })
                        ),
                    ),
                );
            } else {
                controlInputs = [];

                controlInputs.push(D.div({ className: 'input-control controls-row', key: 'coi-1' },
                    betContainer
                ));

                controlInputs.push(D.div({ className: 'input-control controls-row', key: 'coi-2' },
                    autoCashContainer
                ));
                mainContainer = D.div({className: 'main-container'}, 
                    D.div({className: 'sonic-btn sonic-001'},
                        D.div({className: 'sonic-btn sonic-002'},
                            D.p({className: 'sonic-btn-tip'}, 'Your Balance ($USD)'),
                            D.p({className: 'sonic-003'}, 
                                D.span({className: 'sonic-004'}, 
                                    D.span(null,
                                        D.span(null,
                                            D.span(null, this.state.balanceBitsFormatted)
                                        )    
                                    )
                                )
                            ),
                            D.a({className: 'sonic-005 sonic-btn-2nd', tabIndex: '0', role:'button', href: '/deposit'},
                                D.span({className: 'sonic-btn-label'},
                                    D.p({className: 'sonic-006'}, 'DEPOSIT')
                                ),
                                D.span({className: 'sonic-btn-ripple'})
                            )
                        )
                    ),
                    D.div({className: 'bet-btn bet-001'},
                        D.input({type: 'number', className: 'bet-btn bet-002 input-amount', value:self.state.betSize, onChange: function (e) {
                            self._setBetSize(e.target.value);}}),
                            D.p({className: 'bet-btn-tip'}, 'Your Bet ($USD)'),
                            D.input({type: 'button', className: 'bet-005 bet-btn-2nd', value: 'CHANGE BET', onClick: openPanel}),
                    ),
                    // D.div({className: 'bet-area'}),
                    D.div({ className: 'button-container' },
                        BetButton({
                            engine: this.state.engine,
                            placeBet: this._placeBet,
                            cancelBet: this._cancelBet,
                            cashOut: this._cashOut,
                            isMobileOrSmall: this.props.isMobileOrSmall,
                            betSize: this.state.betSize,
                            betInvalid: this.state.betInvalid,
                            cashOutInvalid: this.state.cashOutInvalid,
                            controlsSize: this.props.controlsSize,
                            gameState: this.state.gameState,
                            placingBet: this.state.placingBet,
                            cashingOut: this.state.cashingOut,
                            balanceSatoshis: this.state.balanceSatoshis,
                            notPlaying: this.state.notPlaying,
                            isBetting: this.state.isBetting
                        })
                    ),
                    D.button({className: 'strategy-btn', onClick: openStrPanel}, 'STRATEGY'),
                    D.div({className: 'bet-btn bet-001'},
                        D.div({className: 'bet-btn bet-002'},
                            D.p({className: 'bet-btn-tip'}, 'Your Bet ($USD)'),
                            D.p({className: 'bet-003'}, 
                                D.span({className: 'bet-004'}, 
                                    D.span(null,
                                        D.span(null,
                                            D.span(null, self.state.betSize)
                                        )    
                                    )
                                )
                            ),
                            // D.a({className: 'bet-005 bet-btn-2nd', tabindex: '0', role:'button', href: '#'},
                            //     D.span({className: 'bet-btn-label'},
                            //         D.p({className: 'bet-006'}, 'CHANGE BET')
                            //     ),
                            //     D.span({className: 'bet-btn-ripple'})
                            // )
                        )
                    ),
                    // D.div({className: 'strategy-btn'},
                    //     D.button({className: 'strategy-btn'})
                    // ),
                
                    // controlInputs,
                    D.div({className: 'black-bg', id: 'black-bg', onClick: closePanel}),    
                );
            }
            var controlPanel = D.div({className: 'control-panel', id: 'control-panel'},
                D.span({className: 'glyphicon glyphicon-remove', onClick: closePanel}),
                D.div({className: 'title'}, 'Choose your bet'),
                D.div({className: 'btn-group'},
                    D.div({className: 'btn-row'},
                        D.input({type: 'button', className: 'betting-btn', value: '1', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '2', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '3', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '5', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '8', onClick: function(e) {self._setBetSize(e.target.value);}}),
                    ),
                    D.div({className: 'btn-row'},
                        D.input({type: 'button', className: 'betting-btn', value: '10', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '15', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '20', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '25', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '30', onClick: function(e) {self._setBetSize(e.target.value);}}),
                    ),
                    D.div({className: 'btn-row'},
                        D.input({type: 'button', className: 'betting-btn', value: '75', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '150', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '500', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '1250', onClick: function(e) {self._setBetSize(e.target.value);}}),
                        D.input({type: 'button', className: 'betting-btn', value: '2500', onClick: function(e) {self._setBetSize(e.target.value);}}),
                    ),
                ),
                D.div({className: 'separation-line'},
                    D.div({className: 'left-line'}),
                    D.div(null, 'or'),
                    D.div({className: 'right-line'})
                ),
                D.div({className: 'value-area'},
                    D.div({className: 'half-area'},
                        D.input({type: 'range', className: 'bet-range', id: 'bet-range', min: '1', max: '2500', value: self.state.betSize, onChange: function (e) {
                            self._setBetSize(e.target.value);
                        }})
                    ),
                    D.div({className: 'half-area'},
                        D.input({type: 'text', className: 'bet-value', value: self.state.betSize, onChange: function (e) {
                            self._setBetSize(e.target.value);
                        }})
                    )
                ),
                D.div({className: 'value-area'},
                    D.div({className: 'half-area'},
                        D.input({type: 'button', value: 'CANCEL', className: 'cancel-btn', onClick: closePanel})
                    ),
                    D.div({className: 'half-area'},
                        D.input({type: 'button', value: 'CONFIRM', className: 'ok-btn', onClick: closePanel })
                    )
                )
            );

            var strategyPanel = D.div({className: 'strategy-panel', id: 'strategy-panel'}, 
                D.span({className: 'glyphicon glyphicon-remove', onClick: closeStrPanel}),
                D.div({className: 'title'}, 'Choose your bet'),
                D.div({className: 'panel-area'},
                    D.div({className: 'header-tab'},
                        D.div({className: 'value-area'},
                            D.div({className: 'half-area'},
                                D.input({className: 'tab-btn left-tab', id: 'left-tab', type: 'button', value: 'Auto Cashout', onClick: tabAuto})
                            ),
                            D.div({className: 'half-area'},
                                D.input({className: 'tab-btn right-tab', id: 'right-tab', type: 'button', value: 'Flat bet', onClick: tabFlat})
                            )
                        )
                    ),
                    D.div({className: 'auto-cashout', id: 'auto-cashout'},
                        D.p({className: 'title'}, 'Select a multiplier and it will auto CASH OUT even if you disconnect.'),
                        D.input({
                            className: 'cash-value',
                            type: 'number',
                            min: '1',
                            step: '0.01',
                            name: 'cash-out',
                            disabled: self.state.isPlayingOrBetting,
                            value: self.state.cashOut,
                            onChange: function (e) {
                                self._setAutoCashOut(e.target.value);
                            }
                        }),
                        D.div({className: 'value-area'},
                            D.div({className: 'half-area'},
                                D.input({type: 'button', className: 'cancel-btn', value: 'CANCEL', onClick: closeStrPanel})
                            ),
                            D.div({className: 'half-area'},
                                D.input({type: 'button', className: 'ok-btn', value: 'OK', onClick: closeStrPanel})
                            )
                        )
                    ),
                    D.div({className: 'flat-bet', id: 'flat-bet'},
                        StrategyEditor()
                    )
                )
            );

            //If the user is logged in render the controls
            return D.div({ id: 'controls-inner-container', className: this.props.controlsSize },
                mainContainer,
                // controlInputs,
                D.div({className: 'black-bg', id: 'black-bg', onClick: closePanel}),
                controlPanel,
                strategyPanel
            );
        },

        // _getStatusMessage: function () {
        //    var pi = this.state.engine.currentPlay();
        
        //    if (this.state.engine.gameState === 'STARTING') {
        //        return Countdown({ engine: this.state.engine });
        //    }
        
        //    if (this.state.engine.gameState === 'IN_PROGRESS') {
        //        //user is playing
        //        if (pi && pi.bet && !pi.stopped_at) {
        //            return D.span(null, 'Currently playing...');
        //        } else if (pi && pi.stopped_at) { // user has cashed out
        //            return D.span(null, 'Cashed Out @  ',
        //                D.b({className: 'green'}, pi.stopped_at / 100, 'x'),
        //                ' / Won: ',
        //                D.b({className: 'green'}, Clib.formatSatoshis(pi.bet * pi.stopped_at / 100)),
        //                ' ', Clib.grammarBits(pi.bet * pi.stopped_at / 100)
        //            );
        
        //        } else { // user still in game
        //            return D.span(null, 'Game in progress..');
        //        }
        //    } else if (this.state.engine.gameState === 'ENDED') {
        
        //        var bonus;
        //        if (pi && pi.stopped_at) { // bet and won
        
        //            if (pi.bonus) {
        //                bonus = D.span(null, ' (+',
        //                    Clib.formatSatoshis(pi.bonus), ' ',
        //                    Clib.grammarBits(pi.bonus), ' bonus)'
        //                );
        //            }
        
        //            return D.span(null, 'Cashed Out @ ',
        //                D.b({className: 'green'}, pi.stopped_at / 100, 'x'),
        //                ' / Won: ',
        //                D.b({className: 'green'}, Clib.formatSatoshis(pi.bet * pi.stopped_at / 100)),
        //                ' ', Clib.grammarBits(pi.bet * pi.stopped_at /  1000),
        //                bonus
        //            );
        //        } else if (pi) { // bet and lost
        
        //            if (pi.bonus) {
        //                bonus = D.span(null, ' (+ ',
        //                    Clib.formatSatoshis(pi.bonus), ' ',
        //                    Clib.grammarBits(pi.bonus), ' bonus)'
        //                );
        //            }
        
        //            return D.span(null,
        //                'Busted @ ', D.b({className: 'red'},
        //                    this.state.engine.tableHistory[0].game_crash / 100, 'x'),
        //                ' / You lost ', D.b({className: 'red'}, pi.bet / 100), ' ', Clib.grammarBits(pi.bet),
        //                bonus
        //            );
        
        //        } else { // didn't bet
        
        //          if (this.state.engine.tableHistory[0].game_crash === 0) {
        //            return D.span(null, D.b({className: 'red'}, 'INSTABUST!'));
        //          }
        
        //          return D.span(null,
        //              'Busted @ ', D.b({className: 'red'}, this.state.engine.tableHistory[0].game_crash / 100, 'x')
        //          );
        //        }
        
        //    }
        // }
    });
});