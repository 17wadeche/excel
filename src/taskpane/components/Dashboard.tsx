// src/taskpane/components/Dashboard.tsx
import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Modal, Card, Button, Tooltip, message, Spin, Switch } from "antd";
import EditWidgetForm from "./EditWidgetForm";
import MetricWidget from "./widgets/MetricWidget";
import { BREAKPOINTS, GRID_COLS } from "./layoutConstants";
import LineSettingsModal from "./LineSettingsModal";
import TitleWidgetComponent from "./TitleWidget";
import {
  ReloadOutlined,
  CloseOutlined,
  EditOutlined,
  UndoOutlined,
  FundProjectionScreenOutlined,
  RedoOutlined,
  FullscreenExitOutlined,
  CopyOutlined,
  SaveOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import "./Dashboard.css";
import { DashboardContext } from "../context/DashboardContext";
import {
  Widget,
  ChartData,
  TextData,
  ImageWidgetData,
  TableData,
  GridLayoutItem,
  TableWidget,
  DashboardBorderSettings,
  LineWidgetData,
  TitleWidgetData,
  GanttWidgetData,
  MetricData,
  DashboardItem,
} from "./types";
import TextWidget from "./widgets/TextWidget";
import SalesChart from "./widgets/SalesChart";
import GanttChartComponent from "./widgets/GanttChart";
import ImageWidget from "./widgets/ImageWidget";
import "./themes.css";
import { v4 as uuidv4 } from "uuid";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import TableWidgetComponent from "./widgets/TableWidget";
import Draggable from "react-draggable";
import { isEqual, debounce } from "lodash";
import LineWidget from "./widgets/LineWidget";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PresentationDashboard from "./PresentationDashboard";
import { dashboardApi } from "../utils/apiClient";
import { logger } from "../utils/logger";
import { validateDashboardPayload, createBackupFileName } from "../utils/dashboardValidation";
import { useParams } from "react-router-dom";
const defaultTitleWidget: Widget = {
  id: "dashboard-title",
  type: "title",
  data: {
    content: "Your Dashboard Title",
    fontSize: 24,
    textColor: "#000000",
    backgroundColor: "#ffffff",
    titleAlignment: "center",
  } as TitleWidgetData,
};
interface DashboardProps {
  isPresenterMode?: boolean;
  closePresenterMode?: () => void;
  onEditWidget?: (widget: Widget) => void;
  dashboardBorderSettings?: DashboardBorderSettings;
  isFullScreen?: boolean;
}
const ResponsiveGridLayout = WidthProvider(Responsive);
async function generatePdfBlobFromDom(dashboardElement: HTMLDivElement): Promise<Blob> {
  const originalStyles = saveOriginalStyles(dashboardElement);
  try {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";
    await new Promise((resolve) => requestAnimationFrame(resolve));
    let fullWidth = dashboardElement.scrollWidth;
    let fullHeight = dashboardElement.scrollHeight;
    const extraPixels = 8;
    fullWidth += extraPixels;
    fullHeight += extraPixels;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const canvas = await html2canvas(dashboardElement, {
      useCORS: true,
      backgroundColor: "#ffffff",
      scale: 2,
      scrollX: 0,
      scrollY: 0,
      width: fullWidth,
      height: fullHeight,
      windowWidth: fullWidth,
      windowHeight: fullHeight,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", [canvas.width + 5, canvas.height + 4]);
    pdf.addImage(imgData, "PNG", 5, 4, canvas.width, canvas.height, undefined, "FAST");
    return pdf.output("blob");
  } finally {
    restoreOriginalStyles(dashboardElement, originalStyles);
  }
}
function saveOriginalStyles(el: HTMLDivElement) {
  return {
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    htmlHeight: document.documentElement.style.height,
    bodyHeight: document.body.style.height,
    elPosition: el.style.position,
    elWidth: el.style.width,
    elHeight: el.style.height,
    elOverflow: el.style.overflow,
    elMargin: el.style.margin,
    elPadding: el.style.padding,
  };
}
function restoreOriginalStyles(el: HTMLDivElement, styles: any) {
  document.documentElement.style.overflow = styles.htmlOverflow;
  document.body.style.overflow = styles.bodyOverflow;
  document.documentElement.style.height = styles.htmlHeight;
  document.body.style.height = styles.bodyHeight;
  el.style.position = styles.elPosition;
  el.style.width = styles.elWidth;
  el.style.height = styles.elHeight;
  el.style.overflow = styles.elOverflow;
  el.style.margin = styles.elMargin;
  el.style.padding = styles.elPadding;
}
const Dashboard: React.FC<DashboardProps> = React.memo(
  ({ isPresenterMode = false, closePresenterMode, isFullScreen }) => {
    const {
      widgets,
      addWidget,
      removeWidget,
      updateWidget,
      refreshAllCharts,
      layouts,
      setLayouts,
      updateLayoutsForNewWidgets,
      undo,
      dashboardBorderSettings,
      redo,
      canUndo,
      dashboardTitle,
      canRedo,
      currentDashboardId,
      currentDashboard,
      currentWorkbookId,
      availableWorksheets,
      setCurrentDashboard,
      exportDashboardAsPDF,
      setCurrentDashboardId,
      setDashboards,
      refreshTableWidgetData,
    } = useContext(DashboardContext)!;
    const { id } = useParams<{ id: string }>();
    const [isFullscreenActive] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const isEditingEnabled = !isPresenterMode && !isFullscreenActive && !isFullScreen && !isSaving;
    const borderStyle: React.CSSProperties = useMemo(() => {
      return dashboardBorderSettings?.showBorder
        ? {
            border: `${dashboardBorderSettings.thickness}px ${dashboardBorderSettings.style} ${dashboardBorderSettings.color}`,
          }
        : {};
    }, [dashboardBorderSettings]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);
    const [isLineSettingsModalVisible, setIsLineSettingsModalVisible] = useState(false);
    const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
    const isUpdatingFromItem = useRef(false);
    const prevLayoutsRef = useRef<{ [key: string]: GridLayoutItem[] }>({});
    const [isPresentationMode] = useState(false);
    const [fullScreenDialog] = useState<Office.Dialog | null>(null);
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [saveStatusMessage, setSaveStatusMessage] = useState("Saved");
    const hasTrackedInitialDashboardState = useRef(false);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const dashboardWidth = dashboardBorderSettings.width
      ? Math.min(Math.max(dashboardBorderSettings.width, 300), 733)
      : 733;
    const wrapperStyle: React.CSSProperties = {
      width: `${dashboardWidth}px`,
      marginLeft: 0,
      marginRight: "auto",
      backgroundColor: dashboardBorderSettings.backgroundColor || "white",
      ...(dashboardBorderSettings.showBorder
        ? {
            border: `${dashboardBorderSettings.thickness}px ${dashboardBorderSettings.style} ${dashboardBorderSettings.color}`,
          }
        : {}),
    };
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentWidget, setCurrentWidget] = useState<Widget | null>(null);
    const handleRefresh = useCallback(async () => {
      if (isPresenterMode) {
        return;
      }
      setIsRefreshing(true);
      await refreshAllCharts();
      setIsRefreshing(false);
    }, [isPresenterMode, refreshAllCharts]);
    useEffect(() => {
      if (isPresenterMode) return;
      if (!layouts) return;
      const layoutItemIds = new Set<string>(
        Object.values(layouts as Record<string, GridLayoutItem[]>)
          .reduce<GridLayoutItem[]>((acc, layout) => acc.concat(layout), [])
          .map((item: GridLayoutItem) => item.i)
      );
      const widgetsWithoutLayout = widgets.filter((widget) => !layoutItemIds.has(widget.id));
      if (widgetsWithoutLayout.length > 0) {
        logger.debug(
          "Adding layouts for new widgets:",
          widgetsWithoutLayout.map((w) => w.id)
        );
        updateLayoutsForNewWidgets(widgetsWithoutLayout);
      }
    }, [widgets, isPresenterMode, layouts, updateLayoutsForNewWidgets]);
    const handlePresentDashboard = async () => {
      if (!dashboardRef.current) {
        message.error("Dashboard container not found.");
        return;
      }
      message.info("Exporting dashboard as PDF (existing method)...");
      if (exportDashboardAsPDF) {
        await exportDashboardAsPDF();
      } else {
        message.warning("No exportDashboardAsPDF() found in context, skipping that step...");
      }
      message.success("PDF downloaded using existing export method.");
      message.info("Generating in-memory PDF for embedding...");
      const pdfBlob = await generatePdfBlobFromDom(dashboardRef.current);
      const tempUrl = URL.createObjectURL(pdfBlob);
      message.success("In-memory PDF generated.");
      const rect = dashboardRef.current.getBoundingClientRect();
      const windowWidth = Math.round(rect.width) + 100;
      const windowHeight = Math.max(900, Math.round(rect.height) + 150);
      const newWin = window.open(
        "",
        "PDFPresentation",
        `width=${windowWidth},height=${windowHeight},resizable,scrollbars=yes`
      );
      if (!newWin) {
        message.error("Failed to open new window for presentation.");
        return;
      }
      const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>${dashboardTitle || "Dashboard Presentation"}</title>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              overflow: auto;
              background: #fff;
            }
            iframe {
              border: none;
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <iframe src="${tempUrl}" title="Dashboard PDF"></iframe>
        </body>
      </html>
    `;
      newWin.document.open();
      newWin.document.write(htmlContent);
      newWin.document.close();
    };
    useEffect(() => {
      if (fullScreenDialog && !isUpdatingFromItem.current) {
        const dashboardData = {
          components: widgets,
          layouts,
          id: currentDashboardId,
          title: dashboardTitle,
          borderSettings: dashboardBorderSettings,
        };
        fullScreenDialog.messageChild(
          JSON.stringify({
            type: "updateDashboardData",
            dashboard: dashboardData,
            currentWorkbookId,
            availableWorksheets,
          })
        );
      }
    }, [
      widgets,
      layouts,
      dashboardBorderSettings,
      fullScreenDialog,
      currentDashboardId,
      dashboardTitle,
      currentWorkbookId,
      availableWorksheets,
    ]);
    useEffect(() => {
      if (id) {
        setCurrentDashboardId(id);
      }
    }, [id, setCurrentDashboardId]);
    useEffect(() => {
      if (
        currentDashboard &&
        currentDashboard.layouts &&
        Object.keys(currentDashboard.layouts).length > 0 &&
        !isEqual(currentDashboard.layouts, prevLayoutsRef.current)
      ) {
        setLayouts(currentDashboard.layouts);
        prevLayoutsRef.current = currentDashboard.layouts;
      }
    }, [currentDashboard, setLayouts]);
    const downloadDashboardBackup = useCallback(
      (dashboard: DashboardItem) => {
        const blob = new Blob([JSON.stringify(dashboard, null, 2)], { type: "application/json" });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = createBackupFileName(dashboard.title || dashboardTitle);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      },
      [dashboardTitle]
    );
    const handleSave = useCallback(async () => {
      if (!currentDashboardId || !currentDashboard) return;
      const saveOperation = async () => {
        setIsSaving(true);
        const updatedDashboard: DashboardItem = {
          ...currentDashboard,
          workbookId: currentWorkbookId,
          components: widgets,
          layouts: layouts,
          title: dashboardTitle,
          borderSettings: dashboardBorderSettings,
        };
        try {
          const validation = validateDashboardPayload(updatedDashboard);
          if (!validation.valid) {
            throw new Error(`Dashboard validation failed: ${validation.errors.join("; ")}`);
          }
          const res = await dashboardApi.update(currentDashboardId, updatedDashboard);
          const savedDashboard = res.data;
          setCurrentDashboard(savedDashboard);
          setDashboards((prev: DashboardItem[]) => {
            const idx = prev.findIndex((d: DashboardItem) => d.id === savedDashboard.id);
            if (idx === -1) {
              return [...prev, savedDashboard];
            }
            const newDashboards = [...prev];
            newDashboards[idx] = savedDashboard;
            return newDashboards;
          });
          setHasUnsavedChanges(false);
          setLastSavedAt(new Date());
          setSaveStatusMessage("Saved");
          message.success("Dashboard saved successfully!");
        } catch (err) {
          logger.error("Error saving dashboard:", err);
          downloadDashboardBackup(updatedDashboard);
          setSaveStatusMessage("Save failed - backup downloaded");
          message.error("Failed to save changes to server. A local JSON backup was downloaded.");
        } finally {
          setIsSaving(false);
        }
      };
      saveQueueRef.current = saveQueueRef.current.then(saveOperation, saveOperation);
      await saveQueueRef.current;
    }, [
      currentDashboardId,
      currentDashboard,
      currentWorkbookId,
      widgets,
      layouts,
      dashboardTitle,
      dashboardBorderSettings,
      setCurrentDashboard,
      setDashboards,
      downloadDashboardBackup,
    ]);
    const isSavingRef = useRef(isSaving);
    useEffect(() => {
      isSavingRef.current = isSaving;
    }, [isSaving]);
    const debouncedSave = useMemo(
      () =>
        debounce(async () => {
          if (!isSavingRef.current) {
            await handleSave();
          }
        }, 30000),
      [handleSave]
    );
    useEffect(() => {
      if (!hasTrackedInitialDashboardState.current) {
        hasTrackedInitialDashboardState.current = true;
        return;
      }
      if (isSavingRef.current) return;
      setHasUnsavedChanges(true);
      setSaveStatusMessage(
        isAutoSaveEnabled ? "Unsaved changes - autosave pending" : "Unsaved changes"
      );
      if (isAutoSaveEnabled) {
        debouncedSave();
      }
      return () => {
        debouncedSave.cancel();
      };
    }, [
      widgets,
      layouts,
      dashboardTitle,
      dashboardBorderSettings,
      isAutoSaveEnabled,
      debouncedSave,
    ]);
    useEffect(() => {
      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        if (!hasUnsavedChanges) return;
        event.preventDefault();
        event.returnValue = "";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);
    type RglLayoutChangeHandler = NonNullable<
      React.ComponentProps<typeof ResponsiveGridLayout>["onLayoutChange"]
    >;
    type RglEventCallback = NonNullable<
      React.ComponentProps<typeof ResponsiveGridLayout>["onDragStart"]
    >;
    const cloneLayout = <T extends object>(layout?: readonly T[]): GridLayoutItem[] =>
      layout ? layout.map((item) => ({ ...item }) as GridLayoutItem) : [];
    const handleLayoutChange = useCallback<RglLayoutChangeHandler>(
      (_currentLayout, allLayouts) => {
        const syncedLayouts: { [key: string]: GridLayoutItem[] } = { ...layouts };
        BREAKPOINTS.forEach((bp) => {
          const sourceLayout = allLayouts[bp] ?? allLayouts.lg ?? allLayouts.md ?? [];
          syncedLayouts[bp] = cloneLayout(sourceLayout);
        });
        setLayouts(syncedLayouts);
        const mutableAllLayouts = Object.entries(allLayouts).reduce<{
          [key: string]: GridLayoutItem[];
        }>((acc, [bp, layout]) => {
          acc[bp] = cloneLayout(layout);
          return acc;
        }, {});
        if (!isEqual(mutableAllLayouts, prevLayoutsRef.current)) {
          prevLayoutsRef.current = mutableAllLayouts;
          logger.debug("Layouts updated locally (not saved).");
        }
      },
      [layouts, setLayouts]
    );
    const copyWidgetCallback = useCallback(
      (widget: Widget) => {
        const newWidget: Widget = {
          ...widget,
          id: `${widget.type}-${uuidv4()}`,
        };
        addWidget(widget.type, newWidget.data);
        message.success("Widget copied!");
      },
      [addWidget]
    );
    const handleRemoveWidget = useCallback(
      (id: string) => {
        const widgetToRemove = widgets.find((widget) => widget.id === id);
        if (widgetToRemove?.type === "title") {
          message.warning("The title widget cannot be removed.");
          return;
        } else {
          removeWidget(id);
          message.info("Widget removed!");
        }
      },
      [widgets, removeWidget]
    );
    const handleEditWidget = useCallback((widget: Widget) => {
      setEditingWidget(widget);
      if (widget.type === "line") {
        setIsLineSettingsModalVisible(true);
      } else {
        setCurrentWidget(widget);
        setIsModalVisible(true);
      }
    }, []);
    const handleLineSettingsSave = useCallback(
      (updatedData: LineWidgetData) => {
        if (editingWidget) {
          updateWidget(editingWidget.id, updatedData);
        }
        setIsLineSettingsModalVisible(false);
        setEditingWidget(null);
      },
      [editingWidget, updateWidget]
    );
    const handleLineSettingsCancel = useCallback(() => {
      setIsLineSettingsModalVisible(false);
      setEditingWidget(null);
    }, []);
    const handleModalCancel = useCallback(() => {
      setIsModalVisible(false);
      setCurrentWidget(null);
    }, []);
    const handleModalOk = useCallback(
      (updatedData: any) => {
        if (currentWidget) {
          updateWidget(currentWidget.id, updatedData);
        }
        setIsModalVisible(false);
        setCurrentWidget(null);
      },
      [currentWidget, updateWidget]
    );
    const sortWidgetsByZIndex = (widgets: Widget[]): Widget[] => {
      return [...widgets].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    };
    const preventInteractionWhileSaving = useCallback<RglEventCallback>(
      (_layout, _oldItem, _newItem, _placeholder, e) => {
        if (isSaving) {
          e.preventDefault();
          return false;
        }
        return true;
      },
      [isSaving]
    );
    const widgetElements = useMemo(() => {
      const sortedWidgets = sortWidgetsByZIndex(widgets);
      return sortedWidgets.map((widget) => {
        let content;
        if (widget.type === "text") {
          content = <TextWidget data={widget.data as TextData} />;
        } else if (widget.type === "chart") {
          const chartData = widget.data as ChartData;
          content = <SalesChart key={widget.id} data={chartData} type={chartData.type} />;
        } else if (widget.type === "title") {
          content = <TitleWidgetComponent data={widget.data as TitleWidgetData} />;
        } else if (widget.type === "image") {
          content = <ImageWidget data={widget.data as ImageWidgetData} />;
        } else if (widget.type === "line") {
          content = <LineWidget data={widget.data as LineWidgetData} />;
        } else if (widget.type === "gantt") {
          content = (
            <GanttChartComponent
              tasks={(widget.data as GanttWidgetData).tasks}
              title={(widget.data as GanttWidgetData).title}
              arrowColor={(widget.data as GanttWidgetData).arrowColor ?? "#7d7d7d"}
              defaultProgressColor={
                (widget.data as GanttWidgetData).defaultProgressColor ?? "#1890ff"
              }
            />
          );
        } else if (widget.type === "metric") {
          content = <MetricWidget id={widget.id} data={widget.data as MetricData} />;
        } else if (widget.type === "table") {
          const tableWidget = widget as TableWidget;
          content = (
            <TableWidgetComponent
              key={tableWidget.id}
              id={tableWidget.id}
              name={tableWidget.name}
              data={tableWidget.data as TableData}
              onRefresh={(id) => refreshTableWidgetData(id)}
            />
          );
        }
        return (
          <div
            key={widget.id}
            className="grid-item"
            style={{ padding: 0, margin: 0, position: "relative", zIndex: widget.zIndex || 0 }}
          >
            {isEditingEnabled && (
              <div className="widget-actions">
                <EditOutlined
                  onClick={() => handleEditWidget(widget)}
                  className="action-icon"
                  aria-label={`Edit ${widget.type} Widget`}
                />
                {widget.id !== "dashboard-title" && (
                  <>
                    <CloseOutlined
                      onClick={() => handleRemoveWidget(widget.id)}
                      className="action-icon"
                      aria-label={`Remove ${widget.type} Widget`}
                    />
                    <CopyOutlined
                      onClick={() => copyWidgetCallback(widget)}
                      className="action-icon"
                      aria-label={`Copy ${widget.type} Widget`}
                    />
                  </>
                )}
              </div>
            )}
            {widget.type === "line" ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  padding: 0,
                  margin: 0,
                  backgroundColor: "white",
                  zIndex: widget.zIndex || 0,
                }}
              >
                {content}
              </div>
            ) : (
              <Card
                className="widget-card"
                bordered={false}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  margin: "0px",
                  padding: "0px",
                  boxShadow: "none",
                  backgroundColor: "white",
                  zIndex: widget.zIndex || 0,
                }}
              >
                {content}
              </Card>
            )}
          </div>
        );
      });
    }, [widgets, isEditingEnabled, handleRemoveWidget, handleEditWidget, copyWidgetCallback]);
    return (
      <div className="dashboard-wrapper" style={wrapperStyle}>
        <Draggable handle=".drag-handle">
          <div className={`fixed-vertical-toolbar ${isCollapsed ? "collapsed" : ""}`}>
            <div className="drag-handle">
              <Tooltip title="Drag Toolbar" placement="right">
                <MenuOutlined />
              </Tooltip>
            </div>
            {!isCollapsed && (
              <>
                <Tooltip title="Undo" placement="left">
                  <Button
                    type="text"
                    icon={<UndoOutlined />}
                    onClick={undo}
                    disabled={!canUndo}
                    className="toolbar-button"
                    aria-label="Undo"
                  />
                </Tooltip>
                <Tooltip title="Redo" placement="left">
                  <Button
                    type="text"
                    icon={<RedoOutlined />}
                    onClick={redo}
                    disabled={!canRedo}
                    className="toolbar-button"
                    aria-label="Redo"
                  />
                </Tooltip>
                <Tooltip title="Save" placement="left">
                  <Button
                    type="text"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    className="toolbar-button"
                    aria-label="Save"
                    loading={isSaving}
                  />
                </Tooltip>
                <div className="toolbar-save-status" aria-live="polite">
                  {saveStatusMessage}
                  {lastSavedAt
                    ? ` ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </div>
                <Tooltip title="Toggle Auto-Save" placement="left">
                  <Switch
                    checked={isAutoSaveEnabled}
                    onChange={(checked) => setIsAutoSaveEnabled(checked)}
                    checkedChildren=""
                    unCheckedChildren=""
                    aria-label="Toggle Auto-Save"
                    style={{ marginTop: "16px", width: "15px" }}
                  />
                </Tooltip>
                <Tooltip title="Refresh All Charts" placement="left">
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={isRefreshing}
                    disabled={isRefreshing}
                    className="toolbar-button"
                    aria-label="Refresh All Charts"
                  />
                </Tooltip>
                <Tooltip title="Present Dashboard" placement="left">
                  <Button
                    type="text"
                    icon={<FundProjectionScreenOutlined />}
                    onClick={handlePresentDashboard}
                    className="toolbar-button"
                    aria-label="Present Dashboard"
                  />
                </Tooltip>
                {isPresentationMode && <PresentationDashboard />}
              </>
            )}
            <Tooltip title={isCollapsed ? "Expand Toolbar" : "Collapse Toolbar"} placement="left">
              <Button
                type="text"
                icon={isCollapsed ? <MenuOutlined /> : <CloseOutlined />}
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="toolbar-button toggle-button"
                aria-label={isCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
              />
            </Tooltip>
          </div>
        </Draggable>
        {isPresenterMode && (
          <div className="full-screen-exit-button">
            <Button type="primary" icon={<FullscreenExitOutlined />} onClick={closePresenterMode}>
              Exit Full Screen
            </Button>
          </div>
        )}
        <div
          id="dashboard-container"
          ref={dashboardRef}
          className="dashboard-container"
          style={{
            ...borderStyle,
            width: "100%",
            backgroundColor: dashboardBorderSettings.backgroundColor || "white",
            marginLeft: 0,
            marginRight: "auto",
            height: "auto",
            overflow: "auto",
            paddingBottom: "3px",
          }}
        >
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ xxl: 1920, xl: 1600, lg: 1200, md: 996, sm: 768 }}
            cols={GRID_COLS}
            rowHeight={2}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
            isResizable={isEditingEnabled}
            isDraggable={isEditingEnabled}
            onDragStart={preventInteractionWhileSaving}
            onResizeStart={preventInteractionWhileSaving}
            compactType={null}
            preventCollision={false}
            allowOverlap={true}
            margin={[0, 0]}
            containerPadding={[0, 0]}
            useCSSTransforms={false}
          >
            {widgetElements}
          </ResponsiveGridLayout>
          {isSaving && (
            <div className="saving-overlay">
              <Spin tip="Saving..." size="large" />
            </div>
          )}
          {isPresentationMode && <PresentationDashboard />}
          <Modal
            title="Edit Widget"
            open={isModalVisible}
            onCancel={handleModalCancel}
            footer={null}
          >
            {currentWidget && (
              <EditWidgetForm
                widget={currentWidget}
                onSubmit={handleModalOk}
                onCancel={handleModalCancel}
                isPresenterMode={isPresenterMode}
              />
            )}
          </Modal>
          {isLineSettingsModalVisible && editingWidget && editingWidget.type === "line" && (
            <LineSettingsModal
              visible={isLineSettingsModalVisible}
              data={editingWidget.data as LineWidgetData}
              onSave={handleLineSettingsSave}
              onCancel={handleLineSettingsCancel}
            />
          )}
        </div>
      </div>
    );
  }
);
export default Dashboard;