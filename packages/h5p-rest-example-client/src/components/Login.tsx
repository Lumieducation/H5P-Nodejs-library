import React from 'react';
import Alert from 'react-bootstrap/Alert';
import { Button, Col, Dropdown, Row } from 'react-bootstrap';

import { ContentService } from '../services/ContentService';

export default class Login extends React.Component<
    {
        contentService: ContentService;
        onLoggedIn: () => void;
        onLoggedOut: () => void;
    },
    {
        loginData?: {
            username: string;
            name: string;
            email: string;
            csrfToken: string;
        };
        loginMessage?: string;
    }
> {
    constructor(props) {
        super(props);
        this.state = {};
    }

    private login = (username) => {
        fetch('/login', {
            method: 'POST',
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: username
            })
        })
            .then(async (res) => {
                if (res.status === 200) {
                    const loginData = await res.json();
                    this.setState({
                        ...this.state,
                        loginData,
                        loginMessage: undefined
                    });
                    if (loginData.csrfToken) {
                        this.props.contentService.setCsrfToken(
                            loginData.csrfToken
                        );
                    }
                    this.props.onLoggedIn();
                } else {
                    this.setState({
                        ...this.state,
                        loginData: undefined,
                        loginMessage: await res.text()
                    });
                    this.props.contentService.setCsrfToken(undefined);
                    this.props.onLoggedOut();
                }
            })
            .catch((reason) => {
                this.setState({
                    ...this.state,
                    loginData: undefined,
                    loginMessage: reason
                });
                this.props.contentService.setCsrfToken(undefined);
                this.props.onLoggedOut();
            });
    };

    logout = () => {
        fetch('/logout', {
            method: 'POST',
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-type': 'application/json',
                'CSRF-Token': this.props.contentService.getCsrfToken() ?? ''
            },
            body: JSON.stringify({})
        })
            .then(() => {
                this.setState({
                    ...this.state,
                    loginData: undefined,
                    loginMessage: undefined
                });
                this.props.contentService.setCsrfToken(undefined);
                this.props.onLoggedOut();
            })
            .catch((reason) => {
                this.setState({
                    ...this.state,
                    loginData: undefined,
                    loginMessage: `Error logging out: ${reason}`
                });
                this.props.contentService.setCsrfToken(undefined);
                this.props.onLoggedOut();
            });
    };

    render() {
        return (
            <React.Fragment>
                {!this.state.loginData ? (
                    <Dropdown>
                        <Dropdown.Toggle variant="success" id="dropdown-basic">
                            Login as
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item
                                onClick={() => this.login('teacher1')}
                            >
                                Teacher 1
                            </Dropdown.Item>
                            <Dropdown.Item
                                onClick={() => this.login('teacher2')}
                            >
                                Teacher 2
                            </Dropdown.Item>
                            <Dropdown.Item
                                onClick={() => this.login('student1')}
                            >
                                Student 1
                            </Dropdown.Item>
                            <Dropdown.Item
                                onClick={() => this.login('student2')}
                            >
                                Student 2
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => this.login('admin')}>
                                Administrator
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                ) : (
                    <Row className="align-items-center">
                        <Col>{this.state.loginData.name}</Col>
                        <Col>
                            <Button onClick={this.logout}>Logout</Button>
                        </Col>
                    </Row>
                )}
                {this.state.loginMessage && (
                    <Alert variant="error">{this.state.loginMessage}</Alert>
                )}
            </React.Fragment>
        );
    }
}
