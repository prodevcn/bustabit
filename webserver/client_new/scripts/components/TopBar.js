define([
    'react',
    'game-logic/GameEngineStore',
    'stores/GameSettingsStore',
    'actions/GameSettingsActions',
    'game-logic/clib',
    'screenfull'
], function(
    React,
    Engine,
    GameSettingsStore,
    GameSettingsActions,
    Clib,
    Screenfull //Attached to window.screenfull
) {
    var D = React.DOM;

    function getState() {
        console.log('TOP bar =========', Clib.formatSatoshis(Engine.balanceSatoshis));
        return {
            balanceBitsFormatted: Clib.formatSatoshis(Engine.balanceSatoshis),
            username: Engine.username,
            theme: GameSettingsStore.getCurrentTheme()//black || white
        };
    }
    function openNav () {
        // this.setState({isOpenMenu: true})
        // alert("ssssss");
        // localStorage.setItem('username')
        document.getElementById("sideMenu").style.right="0";
        document.getElementById("black-screen").style.display="block";
    }
    function closeNav () {
        // this.setState({isOpenMenu: true})
        // alert("ssssss");
        document.getElementById("sideMenu").style.right="-320px";
        document.getElementById("black-screen").style.display="none";
    }
    function logout() {
        if (document.getElementById('logout') ) {
            if (confirm("Are you sure you want to log out?")) {
                // localStorage.clear();
                localStorage.removeItem('username');
                document.getElementById("logout").submit();
            }
        }
    }

    return React.createClass({
        displayName: 'TopBar',
        mixins: [React.addons.PureRenderMixin],

        propTypes: {
            isMobileOrSmall: React.PropTypes.bool.isRequired,
            // openNav: React.PropTypes.func.isRequired
        },

        getInitialState: function() {
            var state = getState();
            state.fullScreen = false;
            state.isOpenMenu = false;
            return state;
        },

        componentDidMount: function() {
            Engine.on({
                joined: this._onChange,
                game_started: this._onChange,
                game_crash: this._onChange,
                cashed_out: this._onChange
            });
            GameSettingsStore.on('all', this._onChange);
        },
        
        componentWillUnmount: function() {
            Engine.off({
                joined: this._onChange,
                game_started: this._onChange,
                game_crash: this._onChange,
                cashed_out: this._onChange
            });
            GameSettingsStore.off('all', this._onChange);
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState(getState());
        },

        _toggleTheme: function() {
            GameSettingsActions.toggleTheme();
        },

        _toggleFullScreen: function() {
        	window.screenfull.toggle();
            this.setState({ fullScreen: !this.state.fullScreen });
        },

        render: function() {
            var userLogin;
            var menuBtn;
            var sideMenu;
            if (this.state.username) {
                localStorage.setItem('username', this.state.username);
                userLogin = D.div({ className: 'user-login' },
                    D.div({ className: 'balance-bits' },
                        D.span(null, '$USD: '),
                        D.span({ className: 'balance' }, this.state.balanceBitsFormatted )
                    ),
                    D.div({ className: 'username' },
                        D.a({ href: '/account'}, this.state.username
                    ))
                );
                
                menuBtn = D.div({className: 'menu-btn', onClick: openNav}, D.i({className: 'fa fa-user'}),D.h3({className: ''}, this.state.username));
                sideMenu = D.div({className: 'sidebar', id: 'sideMenu'}, 
                    D.form({action: '/logout', method: 'post', id: 'logout'}),
                    D.div({className: 'sidebar__content'}, 
                        // D.div({className: 'sidebar__welcome'}, 'Welcome To'),
                        D.div({className: 'sidebar__to'}, this.state.username),
                        D.a({href: 'faq#fair'}, 
                            D.span({className: 'nav__icon'}, 
                                D.i({className: 'fa fa-user'})
                            ),
                            D.span({ className: 'bit-balance' }, (this.state.balanceBitsFormatted + '$USD')),
                            // D.h3(null, 'mBTC')
                        )
                        // D.div({className: 'sidebar__buttons'},
                        //     D.a({href: '/login', className: 'button button_blue button_small'}, 'Log in'),
                        //     D.a({href: '/register', className: 'button button_orange button_small'}, 'Sign up'),
                        // ),
                    ),
                    // D.ul({className: 'nav nav_special'},
                    //     D.li(null,
                    //         D.a({href: 'faq#fair'}, 
                    //             D.span({className: 'nav__icon'}, 
                    //                 D.i({className: 'fa fa-gavel'})
                    //             ),
                    //             'Provably fair'
                    //         )
                    //     )
                    // ),
                    D.ul({className: 'nav', id: 'menu_nav'},
                        // D.li(null, 
                        //     D.a({href: '/play/hall-of-fame'},
                        //         D.span({className: 'nav__icon'}, 
                        //             D.img({className: 'icon', src: 'img/icn_halloffame.svg'})
                        //         ),
                        //         'Hall of Fame'
                        //     )
                        // ),
                        D.li(null, 
                            D.a({href: '/play'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-rocket'}),
                                ),
                                'SONICXROCKET'
                            )
                        ),
                        D.li(null, 
                            D.a({href: '/deposit'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-download'}),
                                ),
                                'DEPOSIT'
                            )
                        ),
                        D.li(null, 
                            D.a({href: '/withdraw'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-upload'}),
                                ),
                                'WITHDRAW'
                            )
                        ),
                        D.li(null,
                            D.a({href: '/transactions'},
                                D.span({className: 'nav__icon'},
                                    D.i({className: 'fa fa-share-alt'}),
                                ),
                                'TRANSACTIONS'
                            )
                        ),
                        D.li(null,
                            D.a({href: '/affiliate'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-users'})
                                ),
                                'AFFILIATE'
                            )
                        ),
                        D.li(null, 
                            D.a({href: '/bonus'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-gift'}),
                                ),
                                'BONUS'
                            )
                        ),
                        D.hr(null),
                        D.li(null, 
                            D.a({href: '/bankroll'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-university'}),
                                ),
                                'BANKROLL'
                            )
                        ),
                        D.li(null,
                            D.a({href: '/faq#fair'}, 
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-gavel'})
                                ),
                                'PROVABLY FAIR'
                            )
                        ),
                        D.hr(null),
                        D.li(null, 
                            D.a({href: '/change-password'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-ellipsis-h'}),
                                ),
                                'CHANGE PASSWORD'
                            )
                        ),
                        D.li(null, 
                            D.a({href: '/two-factor'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-google-plus-square'}),
                                ),
                                'TWO FACTOR AUTHENTICATION'
                            )
                        ),
                        D.li(null,
                            D.a({href: '/jackpothistory'}, 
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-history'})
                                ),
                                'JACKPOT HISTORY'
                            )
                        ),
                        
                        D.hr(null),
                        D.li(null, 
                            D.a({href: '/play/'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-star'})
                                ),
                                'Hall of Fame'
                            )
                        ),
                        D.li(null, 
                            D.a({href: '/guide'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-rocket'}),
                                ),
                                'How to Play'
                            )
                        ),
                        D.li(null, 
                            D.a({href: '/faq'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-weixin'}),
                                ),
                                'FAQ'
                            )
                        ),
                        D.li(null, 
                            D.a({href: '/privacy-policy'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-book'}),
                                ),
                                'Terms & Conditions'
                            )
                        ),
                        D.li(null, 
                            D.a({href: '/contact'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-envelope-o'}),
                                ),
                                'Contact'
                            )
                        ),
                        D.hr(null),
                        D.li(null, 
                            D.a({onClick: logout},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-sign-out'}),
                                ),
                                'LOGOUT'
                            )
                        ),
                    )
                );
            } else {
                userLogin = D.div({ className: 'user-login' },
                    D.div({ className: 'register' },
                        D.a({ href: '/register' }, 'Register' )
                    ),
                    D.div({ className: 'login' },
                        D.a({ href: '/login'}, 'Log in' )
                    )
                );
                menuBtn = D.div({className: 'menu-btn', onClick: openNav}, D.i({className: 'fa fa-bars'}),D.h3({className: ''}, 'MENU'));
                sideMenu = D.div({className: 'sidebar', id: 'sideMenu'}, 
                    D.div({className: 'sidebar__content'}, 
                        D.div({className: 'sidebar__welcome'}, 'Welcome To'),
                        D.div({className: 'sidebar__to'}, 'SonicXRocket'),
                        D.p(null, 'Multiply your Bitcoin in seconds. Log in to your account or create a new one in one click.'),
                        D.div({className: 'sidebar__buttons'},
                            D.a({href: '/login', className: 'button button_blue button_small'}, 'Log in'),
                            D.a({href: '/register', className: 'button button_orange button_small'}, 'Sign up'),
                        ),
                    ),
                    D.ul({className: 'nav nav_special'},
                        D.li(null,
                            D.a({href: '/faq#fair'}, 
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-gavel'})
                                ),
                                'Provably fair'
                            )
                        )
                    ),
                    D.ul({className: 'nav'},
                        D.li(null, 
                            D.a({href: '/leaderboard'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-star'})
                                ),
                                'Hall of Fame'
                            )
                        ),
                        D.li(null, 
                            D.a({href: '/guide'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-rocket'}),
                                ),
                                'How to Play'
                            )
                        ),
                        D.li(null, 
                            D.a({href: 'faq'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-comment-o'}),
                                ),
                                'FAQ'
                            )
                        ),
                        
                        D.li(null, 
                            D.a({href: '/contact/'},
                                D.span({className: 'nav__icon'}, 
                                    D.i({className: 'fa fa-envelope-o'}),
                                ),
                                'Contact'
                            )
                        ),
                    )
                );
            }

            return D.div({ id: 'top-bar' },
                D.div({id: 'black-screen', onClick: closeNav}),
                D.div({ className: 'title' },
                    D.div({className: 'post-area'}, D.img({
                        src: '/img/logo-rocketpot.svg', className: 'lo-go'
                    })),
                    D.a({ href: '/' },
                        D.h1(null, this.props.isMobileOrSmall? 'SxR' : 'SONICXROCKET')
                    )
                ),
                // userLogin,
                menuBtn,
                sideMenu
                // D.div({ className: 'toggle-view noselect' + ((this.state.theme === 'white')? ' black' : ' white'), onClick: this._toggleTheme },
                //     D.a(null,
                //         (this.state.theme === 'white')? 'Go black' : 'Go back'
                //     )
                // ),
                // D.div({ className: 'full-screen noselect', onClick: this._toggleFullScreen },
                // 	 this.state.fullScreen? D.i({ className: 'fa fa-compress' }) : D.i({ className: 'fa fa-expand' })
                // )
            )
        }
    });
});