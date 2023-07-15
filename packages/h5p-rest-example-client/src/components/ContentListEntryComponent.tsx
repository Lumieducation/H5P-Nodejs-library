import React from 'react';
import ListGroupItem from 'react-bootstrap/ListGroupItem';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Overlay from 'react-bootstrap/Overlay';
import Tooltip from 'react-bootstrap/Tooltip';
import Dropdown from 'react-bootstrap/Dropdown';
import Modal from 'react-bootstrap/Modal';
import { Form } from 'react-bootstrap';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFingerprint,
    faBookOpen,
    faWindowClose,
    faSave,
    faCheck,
    faPlay,
    faPencilAlt,
    faFileDownload,
    faTrashAlt,
    faCopyright,
    faHashtag,
    faUser,
    faLock
} from '@fortawesome/free-solid-svg-icons';

import { H5PEditorUI, H5PPlayerUI } from '@lumieducation/h5p-react';

import { IContentListEntry, IContentService } from '../services/ContentService';
import './ContentListEntryComponent.css';

export default class ContentListEntryComponent extends React.Component<{
    contentService: IContentService;
    data: IContentListEntry;
    onDelete: (content: IContentListEntry) => void;
    onDiscard: (content: IContentListEntry) => void;
    onSaved: (data: IContentListEntry) => void;
    generateDownloadLink: (contentId: string) => string;
}> {
    constructor(props: {
        contentService: IContentService;
        data: IContentListEntry;
        onDiscard: (content: IContentListEntry) => void;
        onDelete: (content: IContentListEntry) => void;
        onSaved: (data: IContentListEntry) => void;
        generateDownloadLink: (contentId: string) => string;
    }) {
        super(props);
        this.state = {
            editing: props.data.contentId === 'new',
            playing: false,
            saving: false,
            saved: false,
            loading: true,
            saveErrorMessage: '',
            saveError: false,
            showingCustomCopyright: false,
            showContextIdModal: false,
            showAsUserIdModal: false,
            readOnlyState: false
        };
        this.h5pEditor = React.createRef();
        this.saveButton = React.createRef();
        this.h5pPlayer = React.createRef();
        this.contextIdInput = React.createRef();
        this.asUserIdSelect = React.createRef();
    }

    public state: {
        asUserId?: string;
        contextId?: string;
        editing: boolean;
        loading: boolean;
        playing: boolean;
        readOnlyState: boolean;
        saved: boolean;
        saveError: boolean;
        saveErrorMessage: string;
        saving: boolean;
        showAsUserIdModal: boolean;
        showContextIdModal: boolean;
        showingCustomCopyright: boolean;
    };

    private h5pPlayer: React.RefObject<H5PPlayerUI>;
    private h5pEditor: React.RefObject<H5PEditorUI>;
    private saveButton: React.RefObject<HTMLButtonElement>;
    private contextIdInput: React.RefObject<HTMLInputElement>;
    private asUserIdSelect: React.RefObject<HTMLSelectElement>;

    public render(): React.ReactNode {
        return (
            <ListGroupItem
                key={
                    this.props.data.originalNewKey ?? this.props.data.contentId
                }
            >
                <Container>
                    <Row>
                        <Col className="p-2">
                            <h5>{this.props.data.title}</h5>
                            <Row className="small">
                                <Col
                                    className="me-2 d-flex align-items-center"
                                    lg="auto"
                                >
                                    <FontAwesomeIcon
                                        icon={faBookOpen}
                                        className="me-1"
                                    />
                                    {this.props.data.mainLibrary}
                                </Col>
                                <Col
                                    className="me-2 d-flex align-items-center"
                                    lg="auto"
                                >
                                    <FontAwesomeIcon
                                        icon={faFingerprint}
                                        className="me-1"
                                    />
                                    {this.props.data.contentId}
                                </Col>
                                <Col
                                    className="me-2 d-flex align-items-center"
                                    lg="auto"
                                >
                                    <FontAwesomeIcon
                                        icon={faHashtag}
                                        className="me-1"
                                    />
                                    {this.state.contextId
                                        ? this.state.contextId
                                        : 'no context id'}
                                    <Button
                                        variant="link"
                                        className="d-flex align-items-center"
                                        size="sm"
                                        onClick={() =>
                                            this.showContextIdModal()
                                        }
                                    >
                                        <FontAwesomeIcon
                                            icon={faPencilAlt}
                                            className="me-2"
                                        />
                                    </Button>
                                </Col>
                                <Col
                                    className="me-2 d-flex align-items-center"
                                    lg="auto"
                                >
                                    <FontAwesomeIcon
                                        icon={faUser}
                                        className="me-1"
                                    />
                                    {this.state.asUserId
                                        ? this.state.asUserId
                                        : "displaying real user's state"}
                                    <Button
                                        variant="link"
                                        className="d-flex align-items-center"
                                        size="sm"
                                        onClick={() => this.showAsUserIdModal()}
                                    >
                                        <FontAwesomeIcon
                                            icon={faPencilAlt}
                                            className="me-2"
                                        />
                                    </Button>
                                </Col>
                                <Col
                                    className="me-2 d-flex align-items-center"
                                    lg="auto"
                                >
                                    <FontAwesomeIcon
                                        icon={faLock}
                                        className="me-1"
                                    />

                                    <Form.Check
                                        className="d-flex align-items-center gap-2"
                                        type="checkbox"
                                        id="readOnlyStateCheckbox"
                                        label="read only user state"
                                        checked={this.state.readOnlyState}
                                        onChange={() =>
                                            this.setState({
                                                readOnlyState:
                                                    !this.state.readOnlyState
                                            })
                                        }
                                    ></Form.Check>
                                </Col>
                            </Row>
                        </Col>
                        {this.state.playing ? (
                            <Col className="p-2" lg="auto">
                                <Button
                                    variant="light"
                                    onClick={() => this.close()}
                                >
                                    <FontAwesomeIcon
                                        icon={faWindowClose}
                                        className="me-2"
                                    />
                                    close player
                                </Button>
                            </Col>
                        ) : undefined}
                        {this.state.playing &&
                        this.h5pPlayer.current?.hasCopyrightInformation() ? (
                            <Col className="p-2" lg="auto">
                                <Dropdown>
                                    <Dropdown.Toggle variant="light">
                                        <span>
                                            <FontAwesomeIcon
                                                icon={faCopyright}
                                                className="me-2"
                                            />
                                            Copyright
                                        </span>
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <Dropdown.Item
                                            onClick={() => {
                                                this.showCopyrightCustom();
                                            }}
                                        >
                                            Show in custom dialog
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                            onClick={() => {
                                                this.showCopyrightNative();
                                            }}
                                        >
                                            Show in native H5P dialog
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </Col>
                        ) : undefined}
                        {this.state.editing ? (
                            <Col className="p-2" lg="auto">
                                <Overlay
                                    target={this.saveButton.current}
                                    show={this.state.saveError}
                                    placement="right"
                                >
                                    <Tooltip id="error-tooltip">
                                        {this.state.saveErrorMessage}
                                    </Tooltip>
                                </Overlay>
                                <Button
                                    ref={this.saveButton}
                                    variant="primary"
                                    className={
                                        this.state.saving || this.state.loading
                                            ? 'disabled'
                                            : ''
                                    }
                                    disabled={
                                        this.state.saving || this.state.loading
                                    }
                                    onClick={() => this.save()}
                                >
                                    {this.state.saving ? (
                                        <div
                                            className="spinner-border spinner-border-sm m-1 align-middle"
                                            role="status"
                                        ></div>
                                    ) : (
                                        <FontAwesomeIcon
                                            icon={faSave}
                                            className="me-2"
                                        />
                                    )}{' '}
                                    save{' '}
                                    {this.state.saved ? (
                                        <FontAwesomeIcon
                                            icon={faCheck}
                                            className="me-2"
                                        />
                                    ) : undefined}
                                </Button>
                            </Col>
                        ) : undefined}
                        {this.state.editing && !this.isNew() ? (
                            <Col className="p-2" lg="auto">
                                <Button
                                    variant="light"
                                    onClick={() => this.close()}
                                >
                                    <FontAwesomeIcon
                                        icon={faWindowClose}
                                        className="me-2"
                                    />
                                    close editor
                                </Button>
                            </Col>
                        ) : undefined}
                        {this.state.editing && this.isNew() ? (
                            <Col className="p-2" lg="auto">
                                <Button
                                    variant="light"
                                    onClick={() =>
                                        this.props.onDiscard(this.props.data)
                                    }
                                >
                                    <FontAwesomeIcon
                                        icon={faWindowClose}
                                        className="me-2"
                                    />
                                    discard
                                </Button>
                            </Col>
                        ) : undefined}
                        {!this.isNew() ? (
                            <React.Fragment>
                                <Col className="p-2" lg="auto">
                                    <Button
                                        variant="success"
                                        onClick={() => this.play()}
                                    >
                                        <FontAwesomeIcon
                                            icon={faPlay}
                                            className="me-2"
                                        />
                                        play
                                    </Button>
                                </Col>
                                <Col className="p-2" lg="auto">
                                    <Button
                                        variant="secondary"
                                        onClick={() => this.edit()}
                                    >
                                        <FontAwesomeIcon
                                            icon={faPencilAlt}
                                            className="me-2"
                                        />
                                        edit
                                    </Button>
                                </Col>{' '}
                                <Col className="p-2" lg="auto">
                                    <a
                                        href={this.props.generateDownloadLink(
                                            this.props.data.contentId
                                        )}
                                    >
                                        <Button variant="info">
                                            <FontAwesomeIcon
                                                icon={faFileDownload}
                                                className="me-2"
                                            />
                                            download
                                        </Button>
                                    </a>
                                </Col>
                                <Col className="p-2" lg="auto">
                                    <Button
                                        variant="danger"
                                        onClick={() =>
                                            this.props.onDelete(this.props.data)
                                        }
                                    >
                                        <FontAwesomeIcon
                                            icon={faTrashAlt}
                                            className="me-2"
                                        />
                                        delete
                                    </Button>
                                </Col>
                            </React.Fragment>
                        ) : undefined}
                    </Row>
                </Container>
                {this.state.editing ? (
                    <div
                        className={
                            this.props.data.contentId !== 'new' &&
                            this.state.loading
                                ? 'loading'
                                : ''
                        }
                    >
                        <H5PEditorUI
                            ref={this.h5pEditor}
                            contentId={this.props.data.contentId}
                            loadContentCallback={
                                this.props.contentService.getEdit
                            }
                            saveContentCallback={this.props.contentService.save}
                            onSaved={this.onSaved}
                            onLoaded={this.onEditorLoaded}
                            onSaveError={this.onSaveError}
                        />
                    </div>
                ) : undefined}
                {this.state.playing ? (
                    <div className={this.state.loading ? 'loading' : ''}>
                        <H5PPlayerUI
                            ref={this.h5pPlayer}
                            contentId={this.props.data.contentId}
                            contextId={this.state.contextId || undefined}
                            asUserId={this.state.asUserId || undefined}
                            readOnlyState={this.state.readOnlyState}
                            loadContentCallback={
                                this.props.contentService.getPlay
                            }
                            onInitialized={this.onPlayerInitialized}
                            onxAPIStatement={(
                                statement: any,
                                context: any,
                                event
                            ) => console.log(statement, context, event)}
                        />
                        <div
                            style={{
                                visibility: this.state.loading
                                    ? 'visible'
                                    : 'collapse'
                            }}
                            className="spinner-border spinner-border-sm m-2"
                            role="status"
                        ></div>
                    </div>
                ) : undefined}
                <Modal show={this.state.showingCustomCopyright}>
                    <Modal.Header>
                        <Modal.Title>Copyright information</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <div
                            dangerouslySetInnerHTML={{
                                __html:
                                    this.h5pPlayer.current?.getCopyrightHtml() ??
                                    'No copyright information'
                            }}
                        ></div>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button
                            variant="primary"
                            onClick={() => {
                                this.closeCopyrightCustom();
                            }}
                        >
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>
                <Modal show={this.state.showContextIdModal}>
                    <Modal.Header>
                        <Modal.Title>Change context id</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div>
                            <Form.Label htmlFor="contextIdInput">
                                Set contextId to:
                            </Form.Label>
                            <Form.Control
                                type="text"
                                id="contextIdInput"
                                defaultValue={this.state.contextId}
                                onKeyDown={(e) => {
                                    if (e.code === 'Enter') {
                                        this.setContextId();
                                    }
                                    if (e.code === 'Escape') {
                                        this.closeContextIdModal();
                                    }
                                }}
                                ref={this.contextIdInput}
                            />
                            <Form.Text muted>
                                A contextId allows you to have multiple user
                                states (= data entered by users) for one content
                                - user tuple. A use case is if your users can
                                store the states of multiple attempts. This is
                                an optional feature of the H5P NodeJS version.
                            </Form.Text>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            onClick={() => this.closeContextIdModal()}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => this.setContextId()}
                        >
                            Set context id
                        </Button>
                    </Modal.Footer>
                </Modal>
                <Modal show={this.state.showAsUserIdModal}>
                    <Modal.Header>
                        <Modal.Title>Impersonate user</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div>
                            <Form.Label htmlFor="asUserIdInput">
                                Show the user state of this user:
                            </Form.Label>
                            <Form.Select
                                defaultValue={this.state.asUserId}
                                ref={this.asUserIdSelect}
                            >
                                <option value="">No impersonation</option>
                                <option value="teacher1">Teacher 1</option>
                                <option value="teacher2">Teacher 2</option>
                                <option value="student1">Student 1</option>
                                <option value="student2">Student 2</option>
                                <option value="admin">Administrator</option>
                            </Form.Select>
                            <Form.Text muted>
                                You switch whose user state you want to display
                                here. The example permission system only allows
                                displaying others' user states to teachers and
                                administrators.
                            </Form.Text>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            onClick={() => this.closeAsUserIdModal()}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => this.setAsUserId()}
                        >
                            Impersonate
                        </Button>
                    </Modal.Footer>
                </Modal>
            </ListGroupItem>
        );
    }

    protected play() {
        this.setState({ editing: false, playing: true });
    }

    protected edit() {
        this.setState({ editing: true, playing: false });
    }

    protected close() {
        this.setState({ editing: false, playing: false });
    }

    protected showCopyrightCustom() {
        this.setState({ showingCustomCopyright: true });
    }

    protected closeCopyrightCustom() {
        this.setState({ showingCustomCopyright: false });
    }

    protected showContextIdModal() {
        this.setState({ showContextIdModal: true });
        setTimeout(() => {
            this.contextIdInput.current?.focus();
        }, 100);
    }

    protected closeContextIdModal() {
        this.setState({ showContextIdModal: false });
    }

    protected showAsUserIdModal() {
        this.setState({ showAsUserIdModal: true });
        setTimeout(() => {
            this.asUserIdSelect.current?.focus();
        }, 100);
    }

    protected closeAsUserIdModal() {
        this.setState({ showAsUserIdModal: false });
    }

    protected showCopyrightNative() {
        this.h5pPlayer.current?.showCopyright();
    }

    private onPlayerInitialized = () => {
        this.setState({ loading: false });
    };

    protected async save() {
        this.setState({ saving: true });
        try {
            const returnData = await this.h5pEditor.current?.save();
            if (returnData) {
                await this.props.onSaved({
                    contentId: returnData.contentId,
                    mainLibrary: returnData.metadata.mainLibrary,
                    title: returnData.metadata.title,
                    originalNewKey: this.props.data.originalNewKey
                });
            }
        } catch (error) {
            // We ignore the error, as we subscribe to the 'save-error' and
            // 'validation-error' events.
        }
    }

    protected onSaveError = async (event) => {
        this.setState({
            saving: false,
            saved: false,
            saveError: true,
            saveErrorMessage: event.detail.message
        });
        setTimeout(() => {
            this.setState({
                saveError: false
            });
        }, 5000);
    };

    protected onSaved = async (event) => {
        this.setState({
            saving: false,
            saved: true
        });
        setTimeout(() => {
            this.setState({ saved: false });
        }, 3000);
    };

    protected onEditorLoaded = () => {
        this.setState({ loading: false });
    };

    protected setContextId = () => {
        this.setState({
            contextId: this.contextIdInput.current?.value,
            showContextIdModal: false
        });
    };

    protected setAsUserId = () => {
        this.setState({
            asUserId: this.asUserIdSelect.current?.value,
            showAsUserIdModal: false
        });
    };

    private isNew() {
        return this.props.data.contentId === 'new';
    }
}
