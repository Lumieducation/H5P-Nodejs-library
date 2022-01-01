import React from 'react';
import Alert from 'react-bootstrap/Alert';
import { Button, Col, Dropdown, Row } from 'react-bootstrap';

export default class Login extends React.Component<
    any,
    {
        loginData?: { username: string; name: string; email: string };
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
                    this.setState({
                        ...this.state,
                        loginData: await res.json(),
                        loginMessage: undefined
                    });
                } else {
                    this.setState({
                        ...this.state,
                        loginData: undefined,
                        loginMessage: await res.text()
                    });
                }
            })
            .catch((reason) => {
                this.setState({
                    ...this.state,
                    loginData: undefined,
                    loginMessage: reason
                });
            });
    };

    logout = () => {
        fetch('/logout', {
            method: 'POST',
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-type': 'application/json'
            },
            body: JSON.stringify({})
        })
            .then(() => {
                this.setState({
                    ...this.state,
                    loginData: undefined,
                    loginMessage: undefined
                });
            })
            .catch((reason) => {
                this.setState({
                    ...this.state,
                    loginData: undefined,
                    loginMessage: `Error logging out: ${reason}`
                });
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
