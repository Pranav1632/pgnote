import mongoose from "mongoose";

const { Schema } = mongoose;

export interface IFolder {
  userId: string;
  name: string;
  isPinned: boolean;
  createdAt: Date;
}

const folderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    isPinned: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    versionKey: false,
  }
);

folderSchema.index(
  { userId: 1, name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  }
);
folderSchema.index({ userId: 1, isPinned: -1, createdAt: 1 });

export const FolderModel = mongoose.models.Folder ?? mongoose.model<IFolder>("Folder", folderSchema);

export function getFolderModel(connection: typeof FolderModel.db): typeof FolderModel {
  return (
    (connection.models.Folder as typeof FolderModel | undefined) ??
    connection.model<IFolder>("Folder", folderSchema)
  );
}
