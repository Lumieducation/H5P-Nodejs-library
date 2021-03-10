import AWS from 'aws-sdk';
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
        if (ret.Contents?.length > 0) {
            await s3
                .deleteObjects({
                    Bucket: bucketname,
                    Delete: {
                        Objects: ret.Contents.map((c) => ({ Key: c.Key }))
                    }
                })
                .promise();
        }
    } while (ret.IsTruncated);
    await s3.deleteBucket({ Bucket: bucketname }).promise();
}
