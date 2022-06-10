import React from 'react';
import Container from 'react-bootstrap/Container';
import Alert from 'react-bootstrap/Alert';

import ContentListComponent from './components/ContentListComponent';
import { ContentService } from './services/ContentService';
import Login from './components/Login';

import './App.css';
import { Col, Row } from 'react-bootstrap';

export default class App extends React.Component {
    constructor(props) {
        super(props);
        this.contentService = new ContentService('/h5p');
    }

    private contentService: ContentService;

    render() {
        return (
            <div className="App">
                <Container>
                    <Row>
                        <Col>
                            <h1>H5P NodeJs SPA Demo</h1>
                        </Col>
                        <Col md="auto" className="m-2">
                            <Login contentService={this.contentService} />
                        </Col>
                    </Row>
                    <Alert variant="warning">
                        This demo is for debugging and demonstration purposes
                        only and not suitable for production use!
                    </Alert>
                    <ContentListComponent
                        contentService={this.contentService}
                    ></ContentListComponent>
                </Container>
            </div>
        );
    }
}
