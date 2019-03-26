function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

import React, { Component, createContext, useContext } from 'react';
import identity from 'lodash/identity';
import isFunction from 'lodash/isFunction';
import mapValues from 'lodash/mapValues';
export default (({
  init: init_ = () => {},
  actions: actions_ = () => {},
  storage = typeof window !== 'undefined' && window.localStorage,
  storageKey = 'repersist-store',
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  integrity = () => true,
  load = identity
} = {}) => {
  const init = isFunction(init_) ? init_ : () => init_;
  const actions = isFunction(actions_) ? actions_ : () => actions_;
  const StateContext = createContext();
  const ActionsContext = createContext();

  class Provider extends Component {
    constructor(props) {
      super(props);

      try {
        let stored = storage && storage.getItem(storageKey);
        if (!stored) throw new Error();
        stored = deserialize(stored);
        if (!integrity(stored)) throw new Error();
        this.state = load(stored);
      } catch (_) {
        this.state = init(props);
      }

      storage && storage.setItem(storageKey, serialize(this.state));

      this.setStateAndSave = state => this.setState(state, () => {
        storage && storage.setItem(storageKey, serialize(this.state));
      });

      this.actions = mapValues(actions(this.setStateAndSave.bind(this), props), action => async (...args) => {
        const newState = await action(...args);
        if (typeof newState !== 'undefined') this.setStateAndSave(newState);
      });
    }

    render() {
      return React.createElement(StateContext.Provider, {
        value: this.state
      }, React.createElement(ActionsContext.Provider, {
        value: this.actions
      }, this.props.children));
    }

  }

  const Consumer = ({
    map = identity,
    render,
    children
  }) => React.createElement(StateContext.Consumer, null, state => React.createElement(ActionsContext.Consumer, null, actions => (render || children)(map(state), actions)));

  const ActionsConsumer = ({
    render,
    children
  }) => React.createElement(ActionsContext.Consumer, null, actions => (render || children)(actions));

  const withStore = (map = identity) => Comp => props => React.createElement(Consumer, {
    map: map,
    render: (state, actions) => React.createElement(Comp, _extends({}, props, state, actions))
  });

  const withActions = Comp => props => React.createElement(ActionsConsumer, {
    render: actions => React.createElement(Comp, _extends({}, props, actions))
  });

  const useStore = (map = identity) => {
    const state = useContext(StateContext);
    const actions = useContext(ActionsContext);
    return [map(state), actions];
  };

  const useActions = () => useContext(ActionsContext);

  return {
    Provider,
    Consumer,
    ActionsConsumer,
    withStore,
    withActions,
    useStore,
    useActions
  };
});