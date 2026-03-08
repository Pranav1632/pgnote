import mongoose from "mongoose";

const { Schema } = mongoose;

export interface INote {
  userId: string;
  folderId: string;
  content: string;
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

noteSchema.index({ userId: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, folderId: 1, updatedAt: -1 });

export const NoteModel = mongoose.models.Note ?? mongoose.model<INote>("Note", noteSchema);
