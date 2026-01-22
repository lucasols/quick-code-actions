import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'

describe('move-file-to', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('moveFileToCommand', () => {
    it('should show error when no file is selected', async () => {
      vi.spyOn(vscode.window, 'activeTextEditor', 'get').mockReturnValue(undefined)
      const showErrorMessage = vi.spyOn(vscode.window, 'showErrorMessage')

      const { moveFileToCommand } = await import('./move-file-to')
      await moveFileToCommand(undefined)

      expect(showErrorMessage).toHaveBeenCalledWith('No file selected to move')
    })

    it('should show error when file is not in workspace', async () => {
      const mockUri = { fsPath: '/outside/file.ts' } as vscode.Uri
      vi.spyOn(vscode.workspace, 'getWorkspaceFolder').mockReturnValue(undefined)
      const showErrorMessage = vi.spyOn(vscode.window, 'showErrorMessage')

      const { moveFileToCommand } = await import('./move-file-to')
      await moveFileToCommand(mockUri)

      expect(showErrorMessage).toHaveBeenCalledWith('File must be in a workspace')
    })
  })
})
