// Component Imports
import React from 'react';
import ReactDOM from 'react-dom';
import Cinema from './components/Cinema';


// CSS imports
import './index.css';

class App extends React.Component {
    render() {
        return <Cinema />;
    }
}

ReactDOM.render(<App />, document.querySelector('#root'));
