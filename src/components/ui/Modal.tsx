import ReactPortal from "components/common/ReactPortal";

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

const Modal = ({ children, isOpen, onClose }: ModalProps) => {
  return (
    // TODO: ID is not unique
    <ReactPortal wrapperId="modal--wrapper">
      {isOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={onClose}
            ></div>
            <div className="relative z-10 rounded-lg bg-white">{children}</div>
          </div>
        </div>
      )}
    </ReactPortal>
  );
};

export default Modal;
