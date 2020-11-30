/**
 * This view acts as a wrapper for all the other views in the game
 * it is subscribed to changes in EngineVirtualStore but it only
 * listen to connection changes so every view should subscribe to
 * EngineVirtualStore independently.
 */
define([
    'react',
    'lib/idle-timer',
    'constants/AppConstants',
    'components/TopBar',
    'components/ChartControls',
    'components/TabsSelector',
    'components/Players',
    'components/BetBar',
    'components/Ads',
    'game-logic/clib',
    'game-logic/hotkeys',
    'game-logic/GameEngineStore',
    'stores/GameSettingsStore',
    'stores/StrategyEditorStore',
    'components/ControlsSelector' //add by hacker
], function(
    React,
    IdleTimer,
    AppConstants,
    TopBarClass,
    ChartControlsClass,
    TabsSelectorClass,
    PlayersClass,
    BetBarClass,
    AdsClass,
    Clib,
    Hotkeys,
    GameEngineStore,
    GameSettingsStore,
    StrategyEditorStore,
    ControlsSelectorClass //add by hacker
){
    var TopBar = React.createFactory(TopBarClass);
    var ChartControls = React.createFactory(ChartControlsClass);
    var TabsSelector = React.createFactory(TabsSelectorClass);
    var Players = React.createFactory(PlayersClass);
    var BetBar = React.createFactory(BetBarClass);
    var Ads = React.createFactory(AdsClass);
    var ControlsSelector = React.createFactory(ControlsSelectorClass); //add by hacker

    var D = React.DOM;

    return React.createClass({
        displayName: 'Game',

        getInitialState: function () {
            var state = GameSettingsStore.getState();
            state.showMessage = true;
            state.isMobileOrSmall = Clib.isMobileOrSmall(); //bool
            return state;
        },

        componentDidMount: function() {
            GameSettingsStore.addChangeListener(this._onSettingsChange);
            StrategyEditorStore.addChangeListener(this._onStrategyChange);

            window.addEventListener("resize", this._onWindowResize);
            this._idleTimer.register();
            this._idleTimer.on({
              idle: this._onIdle,
              unidle: this._onUnidle
            });

            Hotkeys.mount();
        },

        componentWillUnmount: function() {
            GameSettingsStore.removeChangeListener(this._onSettingsChange);
            StrategyEditorStore.removeChangeListener(this._onStrategyChange);

            window.removeEventListener("resize", this._onWindowResize);
            this._idleTimer.unregister();
            this._idleTimer.off({
              idle: this._onIdle,
              unidle: this._onUnidle
            });

            Hotkeys.unmount();
        },

        _onSettingsChange: function() {
            if(this.isMounted())
                this.setState(GameSettingsStore.getState());
        },

        _onWindowResize: function() {
            var isMobileOrSmall = Clib.isMobileOrSmall();
            if(this.state.isMobileOrSmall !== isMobileOrSmall)
                this.setState({ isMobileOrSmall: isMobileOrSmall });
        },

        _hideMessage: function() {
            this.setState({ showMessage: false });
        },

        _onStrategyChange: function () {
            this._idleTimer.setState(!StrategyEditorStore.getEditorState());
        },

        _idleTimer: IdleTimer({timeout: AppConstants.Engine.IDLE_TIMEOUT}),
        _onIdle: function() {
	    return;
            console.log('User became idle. Disconnecting..');
            GameEngineStore.ws.disconnect();
        },

        _onUnidle: function() {
 	    return;
            console.log('User became active. Reconnecting..');
            GameEngineStore.ws.connect();
        },

        _onRunScript: function() {
        },

        render: function() {

            var messageContainer;
            if(USER_MESSAGE && this.state.showMessage) {

                var messageContent, messageClass, containerClass = 'show-message';
                switch(USER_MESSAGE.type) {
                    case 'error':
                        messageContent = D.span(null,
                            D.span(null, USER_MESSAGE.text)
                        );
                        messageClass = 'error';
                        break;
                    case 'newUser':
                        messageContent = D.span(null,
                            D.a({ href: "/request" }, "Welcome to Soxbet.org, to start you can request 100 free $USD or you  just watch the current games... have fun :D")
                        );
                        messageClass = 'new-user';
                        break;
                    case 'received':
                        messageContent = D.span(null,
                            D.span(null, "Congratulations you have been credited " +  USER_MESSAGE.qty +  " free $USD. Have fun!")
                        );
                        messageClass = 'received';
                        break;
                    case 'advice':
                        messageContent = D.span(null,
                            D.span(null, USER_MESSAGE.advice)
                        );
                        messageClass = 'advice';
                        break;
                    case 'collect':
                        messageContent = D.span(null,
                            D.a({ href: '/request' }, 'Collect your 100 free $USD!')
                        );
                        messageClass = 'collect';
                        break;
                    default:
                        messageContent = null;
                        messageClass = 'hide';
                        containerClass = '';
                }

                messageContainer = D.div({ id: 'game-message-container', className: messageClass },
                    messageContent,
                    D.a({ className: 'close-message', onClick: this._hideMessage }, D.i({ className: 'fa fa-times' }))
                )
            } else {
                messageContainer = null;
                containerClass = '';
            }

            var rightContainer = !this.state.isMobileOrSmall?
                D.div({ id: 'game-right-container' },
                    Players(),
                    // Players(),
                    // BetBar()
                    D.div({className: 'sorted-users'}, 
                        D.div({className: 'item-entry'},
                            D.h5(null, 'ONLINE :')
                        ),
                        D.div({className: 'item-entry'}, 
                            D.h5(null, 'PLAYING :')
                        ),
                        D.div({className: 'item-entry'},
                            D.h5(null, 'TOTAL BETS :')
                        ),
                    ),
                    Ads()
                ) : null;
            return D.div({ id: 'game-inner-container' },

                TopBar({
                    isMobileOrSmall: this.state.isMobileOrSmall
                }),

                messageContainer,

                D.div({ id: 'game-playable-container', className: containerClass },

                    //Chat and Controls
                    D.div({ id: 'game-left-container', className: this.state.isMobileOrSmall? ' small-window' : '' },
                        D.div({ id: 'chart-controls-row' },
                            D.div({ id: 'chart-controls-col', className: this.state.controlsSize },
                                D.div({ className: 'cell-wrapper' },
                                    ChartControls({
                                        isMobileOrSmall: this.state.isMobileOrSmall,
                                        controlsSize: this.state.controlsSize
                                    }),
                                    D.div({id: 'jackpot-container'},
                                        D.div({id: 'wheel-item'},
                                            D.div({className: 'title-area'},
                                                D.img({className: 'jackpot-wheel', src: '/img/jackpotBarWheel.svg', id: 'jackpot-wheel3'}),
                                                D.div({className: 'description'},
                                                    D.h4({className: 'title-price'}, 'Activated @ 2500.0x'),
                                                    D.h2({className: 'title'}, 'MEGA'),
                                                    D.h3({className: 'currency'}, '$10,000')
                                                )
                                            ),
                                            D.div({className: 'progress-bar third'},
                                                D.div({className: 'color-cover', id: 'peak3'})
                                            )
                                        ),
                                        D.div({id: 'wheel-item'},
                                            D.div({className: 'title-area'},
                                                D.img({className: 'jackpot-wheel', src: '/img/jackpotBarWheel.svg', id: 'jackpot-wheel2'}),
                                                D.div({className: 'description'},
                                                    D.h4({className: 'title-price'}, 'Activated @ 1,250.00x'),
                                                    D.h2({className: 'title'}, 'MAJOR'),
                                                    D.h3({className: 'currency'}, '$5,000')
                                                )
                                            ),
                                            D.div({className: 'progress-bar second'},
                                                D.div({className: 'color-cover', id: 'peak2'})
                                            )
                                        ),
                                        D.div({id: 'wheel-item'},
                                            D.div({className: 'title-area'},
                                                D.img({className: 'jackpot-wheel', src: '/img/jackpotBarWheel.svg', id: 'jackpot-wheel1'}),
                                                D.div({className: 'description'},
                                                    D.h4({className: 'title-price'}, 'Activated @ 250.00x'),
                                                    D.h2({className: 'title'}, 'MINI'),
                                                    D.h3({className: 'currency'}, '$2,000')
                                                )
                                            ),
                                            D.div({className: 'progress-bar first'},
                                                D.div({className: 'color-cover', id: 'peak1'})
                                            )
                                        ),
                                    ),
                                )
                            )
                        ),

                        //Chat, History, etc...
                        D.div({ id: 'tabs-controls-row' },
                            D.div({ id: 'tabs-controls-col' },
                                D.div({ className: 'cell-wrapper' },
                                    TabsSelector({
                                        isMobileOrSmall: this.state.isMobileOrSmall,
                                        controlsSize: this.state.controlsSize
                                    })
                                )
                            )
                        )

                    ),

                    //Players
                    rightContainer,
                    D.div({ id: 'controls-container-bottom', className: this.props.controlsSize },
                        ControlsSelector({
                            isMobileOrSmall: this.state.isMobileOrSmall,
                            controlsSize: this.state.controlsSize
                        })
                    )
                )
            );
        }
    });

});
