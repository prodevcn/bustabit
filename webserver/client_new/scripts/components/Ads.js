define([
    'react',
    'game-logic/clib',
    'lodash',
    'stores/GameSettingsStore',
    'game-logic/GameEngineStore',
    'classnames'
], function(
    React,
    Clib,
    _,
    GameSettingsStore,
    Engine,
    CX
){
    var current_ad = 0;
    function prevPost() {
        if(current_ad == 0) { return; }
        --current_ad;
        var offset = -33.33333 * current_ad;
        document.getElementById('post-area').style.transform = 'translate(' + offset + '%, 0px)';
        // document.getElementsByClassName('dot')
        for (let i = 0; i<3; i++) {
            document.getElementsByClassName('dot')[i].style.opacity = '0.2';    
        }
        document.getElementsByClassName('dot')[current_ad].style.opacity = '1';
        
        
    }
    function nextPost() {
        if(current_ad == 2) { return; }
        ++current_ad;
        var offset = -33.33333 * current_ad;
        document.getElementById('post-area').style.transform = 'translate(' + offset + '%, 0px)';
        for (let i = 0; i<3; i++) {
            document.getElementsByClassName('dot')[i].style.opacity = '0.2';    
        }
        document.getElementsByClassName('dot')[current_ad].style.opacity = '1';
    }
    var D = React.DOM;
    return React.createClass({
        displayName: 'ads',
        componentDidMount: function() {
            
        },
        render: function() {
            return D.div({id: 'ads'}, 
                D.div({className: 'ads-container'}, 
                    D.div({className: 'post-area', id: 'post-area'},
                        D.div({className: 'post-box', id: 'div1'},
                            // D.img({ src: '/img/bitcoins.jpg', className: 'poster'})
                        ),
                        D.div({className: 'post-box', id: 'div2'},
                            // D.img({ src: '/img/bitcoins2.jpg', className: 'poster'})
                        ), 
                        D.div({className: 'post-box', id: 'div3'},
                            // D.img({ src: '/img/bitcoins22.jpg', className: 'poster'})
                        ),  
                        //D.img({ src: '/img/logo-rocketpot.svg', className: 'poster'})
                    ),
                    D.div({className: 'control-area'}, 
                        D.div({className: 'context', onClick: prevPost}, 
                            D.h3(null, '< prev')
                        ),
                        D.div({className: 'context'}, 
                            D.div({className: 'dot-area'},
                                D.span({className: 'dot'}),
                                D.span({className: 'dot'}),
                                D.span({className: 'dot'})
                            )
                            // D.ul(null,
                            //     D.li({className: 'dot'}),
                            //     D.li({className: 'dot'}),
                            //     D.li({className: 'dot'})    
                            // )
                        ),
                        D.div({className: 'context', onClick: nextPost}, 
                            D.h3(null, 'next >')
                        )
                    )
                )
            );
        }
    });
});
