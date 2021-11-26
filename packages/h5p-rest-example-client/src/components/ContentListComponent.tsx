import React from 'react';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';

// The .js references are necessary for requireJs to work in the browser.
import { IContentService, IContentListEntry } from '../services/ContentService';
import ContentListEntryComponent from './ContentListEntryComponent';

export default class ContentList extends React.Component<{
    contentService: IContentService;
}> {
    constructor(props: { contentService: IContentService }) {
        super(props);

        this.state = { contentList: [] };
        this.contentService = props.contentService;
    }

    public state: {
        contentList: IContentListEntry[];
    };

    protected contentService: IContentService;
    /**
     * Keeps track of newly created content to assign a key
     * @memberof ContentList
     */
    protected newCounter = 0;

    public async componentDidMount(): Promise<void> {
        await this.updateList();
    }

    public render(): React.ReactNode {
        return (
            <div>
                <Button
                    variant="primary"
                    onClick={() => this.new()}
                    className="my-2"
                >
                    <FontAwesomeIcon icon={faPlusCircle} className="me-2" />
                    Create new content
                </Button>
                <ListGroup>
                    {this.state.contentList.map((content) => (
                        <ContentListEntryComponent
                            contentService={this.contentService}
                            data={content}
                            key={content.originalNewKey ?? content.contentId}
                            onDiscard={() => this.onDiscard(content)}
                            onDelete={() => this.onDelete(content)}
                            onSaved={(newData) =>
                                this.onSaved(content, newData)
                            }
                            generateDownloadLink={
                                this.contentService.generateDownloadLink
                            }
                        ></ContentListEntryComponent>
                    ))}
                </ListGroup>
            </div>
        );
    }

    protected async updateList(): Promise<void> {
        const contentList = await this.contentService.list();
        this.setState({ contentList });
    }

    protected new() {
        this.setState({
            contentList: [
                {
                    contentId: 'new',
                    mainLibrary: undefined,
                    title: 'New H5P',
                    originalNewKey: `new-${this.newCounter++}`
                },
                ...this.state.contentList
            ]
        });
    }

    protected onDiscard(content) {
        this.setState({
            contentList: this.state.contentList.filter((c) => c !== content)
        });
    }

    protected async onDelete(content: IContentListEntry) {
        if (!content.contentId) {
            return;
        }
        try {
            await this.contentService.delete(content.contentId);
            this.setState({
                contentList: this.state.contentList.filter((c) => c !== content)
            });
        } catch (error) {
            if (error instanceof Error) {
                console.error(error.message);
            }
        }
    }

    protected async onSaved(
        oldData: IContentListEntry,
        newData: IContentListEntry
    ) {
        this.setState({
            contentList: this.state.contentList.map((c) =>
                c === oldData ? newData : c
            )
        });
    }
}
