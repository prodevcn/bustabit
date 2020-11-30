define([
    'react',
    'strategies/strategies',
    'lodash',
    'game-logic/clib',
    'game-logic/GameEngineStore',
    'stores/StrategyEditorStore',
    'actions/StrategyEditorActions'
],function(
    React,
    Strategies,
    _,
    Clib,
    Engine,
    StrategyEditorStore,
    StrategyEditorActions
){

    var D = React.DOM;

    function getState() {
        var state = StrategyEditorStore.getState();
        state.engine = Engine; //Just to know if the user is logged in
        return state;
    }

    return React.createClass({
        displayName: 'strategyEditor',

        getInitialState: function() {
            return getState();
        },

        componentDidMount: function() {
            Engine.on({
                joined: this._onChange,
                disconnected: this._onChange
            });
            StrategyEditorStore.addChangeListener(this._onChange);
        },

        componentWillUnmount: function() {
            Engine.off({
                joined: this._onChange,
                disconnected: this._onChange
            });
            StrategyEditorStore.removeChangeListener(this._onChange);
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState(getState());
        },

        _runStrategy: function() {
            StrategyEditorActions.runStrategy();
            document.getElementById('black-bg').style.display='none';
            document.getElementById('control-panel').style.display='none';
            document.getElementById('strategy-panel').style.display='none';
        },

        _stopStrategy: function() {
            document.getElementById('black-bg').style.display='none';
            document.getElementById('control-panel').style.display='none';
            document.getElementById('strategy-panel').style.display='none'; 
            StrategyEditorActions.stopScript();                       
        },

        _updateScript: function() {
            var script = this.refs.input.value;
            StrategyEditorActions.updateScript(script);
        },

        _selectStrategy: function() {
            var strategyName = this.refs.strategies.value;
            StrategyEditorActions.selectStrategy(strategyName);
        },

        render: function() {
            var self = this;

            var strategiesOptions =_.map(Strategies, function(strategy, strategyName) {
                return D.option({ value: strategyName, key: 'strategy_'+strategyName }, Clib.capitaliseFirstLetter(strategyName));
            });

            var WidgetElement;
            //If the strategy is not a script should be a widget function and we mount it
            if(typeof this.state.strategy == 'function'){
                //Send the strategy StrategyEditorStore and StrategyEditorActions to avoid circular dependencies
                var element = React.createFactory(this.state.strategy);
                WidgetElement = element({ StrategyEditorStore: StrategyEditorStore, StrategyEditorActions: StrategyEditorActions });

            } else {
                WidgetElement = D.textarea({ className: 'strategy-input', ref: 'input', value: self.state.strategy, onChange: self._updateScript, disabled: this.state.active });
            }

            return D.div({ id: 'strategy-container' },
                D.p({className: 'title'}, 'Every round places selected bet and waits for selected payout'),
                D.div(null,
                    WidgetElement
                ),
                D.div({ className: 'value-area' },
                    D.div({className: 'half-area'},
                        D.input({className: 'cancel-btn', value: 'CANCEL', type: 'button', onClick: self._stopStrategy })
                    ),
                    D.div({className: 'half-area'},
                        D.input({className: 'ok-btn', value: 'RUN', type: 'button', onClick: self._runStrategy, disabled: this.state.active || this.state.invalidData || !this.state.engine.username || this.state.engine.connectionState ==! 'JOINED' })
                    )
                    // D.span({ className: 'strategy-invalid-data' }, this.state.invalidData || !this.state.engine.username),
                    
                )
            );
        }
    });

});