import mongoose from "mongoose";

const { Schema } = mongoose;

export interface INote {
  userId: string;
  folderId: string;
  content: string;
  isPublic: boolean;
  shareToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Folder",
      index: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 200_000,
    },
    isPublic: {
      type: Boolean,
      required: true,
      default: false,
    },
    shareToken: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 8,
      maxlength: 64,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

noteSchema.index({ userId: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, folderId: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, shareToken: 1 }, { unique: true, sparse: true });

export const NoteModel = mongoose.models.Note ?? mongoose.model<INote>("Note", noteSchema);

export function getNoteModel(connection: typeof NoteModel.db): typeof NoteModel {
  return (
    (connection.models.Note as typeof NoteModel | undefined) ??
    connection.model<INote>("Note", noteSchema)
  );
}
