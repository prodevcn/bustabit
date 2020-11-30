define([
    'react',
    'components/GraphicsContainer',
    'components/ControlsSelector'
], function(
    React,
    GraphicsContainerClass,
    ControlsSelectorClass
) {
    var D = React.DOM;

    var GraphicsContainer =  React.createFactory(GraphicsContainerClass);
    var ControlsSelector = React.createFactory(ControlsSelectorClass);

    return React.createClass({
        displayName: 'Chart-Controls',

        propTypes: {
            isMobileOrSmall: React.PropTypes.bool.isRequired,
            controlsSize: React.PropTypes.string.isRequired
        },

        render: function() {
            var bet_history=['3954.12x', '571148.96', '13020.53x', '1820.21x', '2089.67x', '1899.73x', '1345.16x', '1355.94x', '3035.05x'];
            return D.div({ id: 'chart-controls-inner-container', className: this.props.controlsSize },
                D.div({ id: 'chart-container', className: this.props.controlsSize },
                    GraphicsContainer({
                        isMobileOrSmall: this.props.isMobileOrSmall,
                        controlsSize: this.props.controlsSize
                    }),
                    D.div({className: 'history-bar', id: 'history-bar'},
                        bet_history.map((item, index) => {
                            return(D.h6({key: index, className: 'history-txt'}, item));
                        })
                    )
                ),
                // D.div({ id: 'controls-container', className: this.props.controlsSize },
                //     ControlsSelector({
                //         isMobileOrSmall: this.props.isMobileOrSmall,
                //         controlsSize: this.props.controlsSize
                //     })
                // )
            );
        }
    });
});