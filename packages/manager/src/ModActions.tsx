import { useRef } from 'preact/hooks';
import { InputEventHandler } from 'preact';

export const ModActinos = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFileInput = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleFileInput: InputEventHandler<HTMLInputElement> = (e) => {
    if (!e.target) return;

    const { files } = e.target as HTMLInputElement;
    if (!files) return;

    const [ file ] = files;
    if (!file) return;

    window.YASCML.mods.add(file);
  };

  return (
    <ul class="buttons mod-actions">
      <li>
        <button
          class="import"
          onClick={showFileInput}
          type="button"
          role="button"
          tabIndex={0}
        >
          Import...
        </button>
        <input
          type="file"
          accept="application/zip"
          onInput={handleFileInput}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
      </li>
      <li>
        <button
          class="restart"
          onClick={() => window.SugarCube!.UI.restart()}
          type="button"
          role="button"
          tabIndex={0}
        >
          Restart
        </button>
      </li>
    </ul>
  );
};
