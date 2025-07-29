
import { RequestId } from '@modelcontextprotocol/sdk/types.js';
import { IStorageInterface } from '../shared/interfaces';


/**
 * Status of a pending request
 */
export type RequestStatus = 'pending' | 'completed' | 'failed';

/**
 * Status of a payment
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed';

/**
 * Record of a pending request with payment details
 */
export interface PaymentAuditRecord {
    // Request identification
    requestId: string;

    // Request details
    serverId: string;
    method: string;
    params?: any;

    // Payment details
    paymentAmount?: string;
    paymentNetwork?: string;
    paymentAsset?: string;
    paymentPayTo?: string;

    // Status tracking
    requestStatus: RequestStatus;
    paymentStatus: PaymentStatus;

    // Timestamps
    createdAt: Date;
    requestCompletedAt?: Date;
    paymentCompletedAt?: Date;

    // Error details
    errorReason?: string;

    // Payment result details (from notification)
    transactionHash?: string;
    payerAddress?: string;
}

const PENDING_PREFIX = "pending:";
const TTL = 86400;

/**
 * In-memory implementation of PaymentAuditStorage
 * In production, this would be replaced with a persistent storage solution
 */
export class PaymentAuditStorage {

    private storage: IStorageInterface;

    constructor(
        props: {
            storage: IStorageInterface
        }
    ) {
        this.storage = props.storage;
    }

    async storePendingRequest(record: Omit<PaymentAuditRecord, 'requestStatus' | 'paymentStatus' | 'createdAt'>): Promise<void> {
        const fullRecord: PaymentAuditRecord = {
            ...record,
            requestStatus: 'pending',
            paymentStatus: 'pending',
            createdAt: new Date(),
        };
        if(!record.requestId) {
            throw new Error("Invalid audit record: missing request id");
        }

        await this.write(this.buildPendingKey(record.requestId), fullRecord);
    }

    async getPendingRequest(requestId: RequestId): Promise<PaymentAuditRecord | null> {
        return await this.read(this.buildPendingKey(requestId)) || null;
    }

    async markRequestCompleted(requestId: RequestId, completedAt?: Date): Promise<void> {
        const record = await this.read(this.buildPendingKey(requestId));
        if (record) {
            record.requestStatus = 'completed';
            record.requestCompletedAt = completedAt || new Date();
            await this.write(requestId.toString(), record);
        }
    }

    async updatePaymentStatus(
        requestId: RequestId,
        status: PaymentStatus,
        details?: {
            transactionHash?: string;
            payerAddress?: string;
            errorReason?: string;
            completedAt?: Date;
        }
    ): Promise<void> {
        const record = await this.read(this.buildPendingKey(requestId));
        if (record) {
            record.paymentStatus = status;
            record.paymentCompletedAt = details?.completedAt || new Date();

            if (details?.transactionHash) {
                record.transactionHash = details.transactionHash;
            }
            if (details?.payerAddress) {
                record.payerAddress = details.payerAddress;
            }
            if (details?.errorReason) {
                record.errorReason = details.errorReason;
            }
            if(status !== 'pending') {
                await this.write(requestId.toString(), record);
            } else {
                await this.write(this.buildPendingKey(requestId), record);
            }
        }
    }

    async removePendingRequest(requestId: RequestId): Promise<void> {
        await this.storage.delete(requestId.toString());
    }

    private buildPendingKey(requestId: RequestId):string {
        return `${PENDING_PREFIX}${requestId.toString()}`;
    }

    private async read(key: string): Promise<PaymentAuditRecord  | undefined> {
        const str = await this.storage.get(key);
        if(str) {
            return JSON.parse(str) as PaymentAuditRecord;
        }
    }

    private async write(key: string, record: PaymentAuditRecord): Promise<void> {
        const str = JSON.stringify(record);
        await this.storage.set(key, str, TTL);
    }
} 