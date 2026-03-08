export interface FolderDTO {
  id: string;
  name: string;
  createdAt: string;
}

export interface NoteDTO {
  id: string;
  folderId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderPayload {
  name: string;
}

export interface CreateNotePayload {
  folderId: string;
  content: string;
}

export interface UpdateNotePayload {
  noteId: string;
  folderId?: string;
  content: string;
}
