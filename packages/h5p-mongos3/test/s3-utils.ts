import { S3 } from '@aws-sdk/client-s3';

export async function emptyAndDeleteBucket(
    s3: S3,
    bucketname: string
): Promise<void> {
    try {
        await s3.headBucket({
            Bucket: bucketname
        });
    } catch {
        return;
    }
    let ret;
    do {
        ret = await s3.listObjectsV2({
            Bucket: bucketname,
            ContinuationToken: ret?.NextContinuationToken
        });
        if (ret.Contents?.length > 0) {
            await s3.deleteObjects({
                Bucket: bucketname,
                Delete: {
                    Objects: ret.Contents.map((c) => ({ Key: c.Key }))
                }
            });
        }
    } while (ret.IsTruncated);
    await s3.deleteBucket({ Bucket: bucketname });
}
