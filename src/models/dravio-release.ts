import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';

export class DravioRelease extends Model {
    public id!: string;
    public version!: string;
    public buildNumber!: number;
    public releaseName!: string;
    public apkFileName!: string;
    public apkFilePath!: string;
    public sizeBytes!: number;
    public sha256!: string;
    public minAndroidVersion!: string;
    public status!: 'STABLE' | 'DEPRECATED' | 'BETA';
    public updateType!: 'OPTIONAL' | 'RECOMMENDED' | 'FORCED' | 'CRITICAL';
    public isMandatory!: boolean;
    public isArchived!: boolean;
    public downloadCount!: number;
    public installCount!: number;
    public changelog!: string;
    public releaseNotes!: string;
    public screenshots!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

DravioRelease.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        version: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        buildNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        releaseName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        apkFileName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        apkFilePath: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        sizeBytes: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 28450120,
        },
        sha256: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        minAndroidVersion: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '8.0 (API level 26)',
        },
        status: {
            type: DataTypes.ENUM('STABLE', 'DEPRECATED', 'BETA'),
            allowNull: false,
            defaultValue: 'STABLE',
        },
        updateType: {
            type: DataTypes.ENUM('OPTIONAL', 'RECOMMENDED', 'FORCED', 'CRITICAL'),
            allowNull: false,
            defaultValue: 'OPTIONAL',
        },
        isMandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isArchived: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        downloadCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1420,
        },
        installCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1180,
        },
        changelog: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        releaseNotes: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        screenshots: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: JSON.stringify([
                '/images/dravio-shot-1.png',
                '/images/dravio-shot-2.png',
                '/images/dravio-shot-3.png'
            ]),
        },
    },
    {
        sequelize,
        tableName: 'dravio_releases',
        timestamps: true,
    }
);
