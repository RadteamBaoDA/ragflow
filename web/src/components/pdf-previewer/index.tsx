import { IReferenceChunk } from '@/interfaces/database/chat';
import { IChunk } from '@/interfaces/database/knowledge';
import FileError from '@/pages/document-viewer/file-error';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { Button, Skeleton, Space } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  AreaHighlight,
  Highlight,
  IHighlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
} from 'react-pdf-highlighter';
import { useCatchDocumentError } from './hooks';

import {
  useGetChunkHighlights,
  useGetDocumentUrl,
} from '@/hooks/use-document-request';
import styles from './index.less';

interface IProps {
  chunk: IChunk | IReferenceChunk;
  documentId: string;
  visible: boolean;
}

const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const DocumentPreviewer = ({ chunk, documentId, visible }: IProps) => {
  const getDocumentUrl = useGetDocumentUrl(documentId);
  const { highlights: state, setWidthAndHeight } = useGetChunkHighlights(chunk);
  const ref = useRef<(highlight: IHighlight) => void>(() => {});
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const url = getDocumentUrl();
  const error = useCatchDocumentError(url);

  const resetHash = () => {};

  useEffect(() => {
    setLoaded(visible);
  }, [visible]);

  useEffect(() => {
    if (state.length > 0 && loaded) {
      setLoaded(false);
      ref.current(state[0]);
    }
  }, [state, loaded]);

  const handleZoomIn = () => {
    setScale((prev) => prev + 0.25);
  };

  const handleZoomOut = () => {
    setScale((prev) => (prev > 0.5 ? prev - 0.25 : prev));
  };

  return (
    <div className={styles.documentContainer}>
      <PdfLoader
        url={url}
        beforeLoad={<Skeleton active />}
        workerSrc="/pdfjs-dist/pdf.worker.min.js"
        errorMessage={<FileError>{error}</FileError>}
      >
        {(pdfDocument) => {
          pdfDocument.getPage(1).then((page) => {
            const viewport = page.getViewport({ scale });
            const width = viewport.width;
            const height = viewport.height;
            setWidthAndHeight(width, height);
          });

          return (
            <PdfHighlighter
              pdfScaleValue={scale.toString()}
              pdfDocument={pdfDocument}
              enableAreaSelection={(event) => event.altKey}
              onScrollChange={resetHash}
              scrollRef={(scrollTo) => {
                ref.current = scrollTo;
                setLoaded(true);
              }}
              onSelectionFinished={() => null}
              highlightTransform={(
                highlight,
                index,
                setTip,
                hideTip,
                viewportToScaled,
                screenshot,
                isScrolledTo,
              ) => {
                const isTextHighlight = !Boolean(
                  highlight.content && highlight.content.image,
                );

                const component = isTextHighlight ? (
                  <Highlight
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    comment={highlight.comment}
                  />
                ) : (
                  <AreaHighlight
                    isScrolledTo={isScrolledTo}
                    highlight={highlight}
                    onChange={() => {}}
                  />
                );

                return (
                  <Popup
                    popupContent={<HighlightPopup {...highlight} />}
                    onMouseOver={(popupContent) =>
                      setTip(highlight, () => popupContent)
                    }
                    onMouseOut={hideTip}
                    key={index}
                  >
                    {component}
                  </Popup>
                );
              }}
              highlights={state}
            />
          );
        }}
      </PdfLoader>
      <div className={styles.zoomContainer}>
        <Space direction="vertical">
          <Button
            icon={<ZoomInOutlined />}
            onClick={handleZoomIn}
            size="small"
          />
          <Button
            icon={<ZoomOutOutlined />}
            onClick={handleZoomOut}
            size="small"
          />
        </Space>
      </div>
    </div>
  );
};

export default DocumentPreviewer;
