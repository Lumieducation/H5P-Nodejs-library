import AWS from 'aws-sdk';
// tslint:disable-next-line: no-submodule-imports
import { PromiseResult } from 'aws-sdk/lib/request';

export async function emptyAndDeleteBucket(
    s3: AWS.S3,
    bucketname: string
): Promise<void> {
    try {
        await s3
            .headBucket({
                Bucket: bucketname
            })
            .promise();
    } catch {
        return;
    }
    let ret: PromiseResult<AWS.S3.ListObjectsV2Output, AWS.AWSError>;
    do {
        ret = await s3
            .listObjectsV2({
                Bucket: bucketname,
                ContinuationToken: ret?.NextContinuationToken
            })
            .promise();
        await s3
            .deleteObjects({
                Bucket: bucketname,
                Delete: {
                    Objects: ret.Contents.map((c) => {
                        return { Key: c.Key };
                    })
                }
            })
            .promise();
    } while (ret.IsTruncated);
    await s3.deleteBucket({ Bucket: bucketname }).promise();
}
