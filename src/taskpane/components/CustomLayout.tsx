// src/taskpane/components/CustomLayout.tsx
import React, { useContext, useState } from "react";
import { Layout, Menu, Button, Modal, Form, Input, InputNumber, message, Tooltip, MenuProps } from "antd";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  PlusOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  LineChartOutlined,
  DashboardOutlined,
  ScheduleOutlined,
  UploadOutlined,
  LineOutlined,
  TableOutlined,
  BorderOutlined,
  AppstoreOutlined,
  DownloadOutlined,
  MailOutlined,
  SaveOutlined,
  PictureOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { DashboardContext } from "../context/DashboardContext";
import ImportChartModal from "./ImportChartModal";
import VersionHistoryModal from "./VersionHistoryModal";
import DashboardSettingsModal from "./DashboardSettingsModal";
import "./CustomLayout.css";
const { Content, Sider } = Layout;
const CustomLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isImportChartModalVisible, setIsImportChartModalVisible] = useState(false);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const [feedbackForm] = Form.useForm();
  const [snapshotForm] = Form.useForm();
  const [exportForm] = Form.useForm();
  const [isVersionHistoryVisible, setIsVersionHistoryVisible] = useState(false);
  const [isSnapshotModalVisible, setIsSnapshotModalVisible] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const location = useLocation();
  const isFullScreen = location.pathname === "/full-screen";
  const dashboardContext = useContext(DashboardContext);
  if (!dashboardContext) {
    throw new Error("DashboardContext must be used within a DashboardProvider");
  }
  const {
    addWidget,
    generateProjectManagementTemplateAndGanttChart,
    exportDashboardAsPDF,
    emailDashboard,
    saveAsTemplate,
    saveDashboardVersion,
    isFetching,
  } = dashboardContext;
  const dashboardActionPaths = [
    "/dashboard",
    "/edit-dashboard",
    "/dashboard-editor",
    "/full-screen",
  ];
  const isInDashboard = dashboardActionPaths.some((path) => location.pathname.startsWith(path));
  const showImportChartModal = () => {
    setIsImportChartModalVisible(true);
  };
  const handleImportChartModalCancel = () => {
    setIsImportChartModalVisible(false);
  };
  const showFeedbackModal = () => {
    setIsFeedbackModalVisible(true);
  };
  const handleFeedbackCancel = () => {
    setIsFeedbackModalVisible(false);
  };
  const handleSnapshotSubmit = (values: { name?: string; note?: string }) => {
    saveDashboardVersion({ name: values.name, note: values.note });
    setIsSnapshotModalVisible(false);
    snapshotForm.resetFields();
  };
  const handleExportSubmit = async (values: { fileName?: string; scale?: number; margin?: number }) => {
    await exportDashboardAsPDF({
      fileName: values.fileName,
      scale: values.scale,
      margin: values.margin,
    });
    setIsExportModalVisible(false);
    exportForm.resetFields();
  };
  const handleFeedbackSubmit = (values: any) => {
    const feedbackEmail = "excel.dashbooard.help@gmail.com";
    const subject = encodeURIComponent(values.subject);
    const body = encodeURIComponent(
      `Name: ${values.name || "N/A"}\nEmail: ${values.email || "N/A"}\n\n${values.message}`
    );
    const mailtoLink = `mailto:${feedbackEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
    message.success("Your email client has been opened to send feedback.");
    setIsFeedbackModalVisible(false);
    feedbackForm.resetFields();
  };
  const onCollapse = (collapsed: boolean) => {
    setCollapsed(collapsed);
  };
  const menuItems: MenuProps["items"] = [
    {
      key: "/create",
      icon: <PlusOutlined />,
      label: <Link to="/create">Create Dashboard</Link>,
    },
    {
      key: "/dashboard-list",
      icon: <UnorderedListOutlined />,
      disabled: isFetching,
      label: isFetching ? (
        <Tooltip title="Loading, please wait...">
          <span style={{ cursor: "not-allowed", color: "rgba(0,0,0,0.25)" }}>
            Dashboard List
          </span>
        </Tooltip>
      ) : (
        <Link to="/dashboard-list">Dashboard List</Link>
      ),
    },
    ...(isInDashboard
      ? [
          {
            key: "add-visuals",
            icon: <PictureOutlined />,
            label: "Add Visuals",
            children: [
              {
                key: "dashboard-settings",
                icon: <BorderOutlined />,
                label: "Dashboard Settings",
                onClick: () => setIsSettingsModalVisible(true),
              },
              { key: "add-line", icon: <LineOutlined />, label: "Line", onClick: () => addWidget("line") },
              { key: "add-text", icon: <FileTextOutlined />, label: "Text", onClick: () => addWidget("text") },
              {
                key: "add-sales-chart",
                icon: <LineChartOutlined />,
                label: "Chart",
                onClick: () => addWidget("chart"),
              },
              {
                key: "import-charts",
                icon: <UploadOutlined />,
                label: "Import Charts from Excel",
                onClick: showImportChartModal,
              },
              {
                key: "add-gantt-template",
                icon: <ScheduleOutlined />,
                label: "Add Gantt Template",
                onClick: generateProjectManagementTemplateAndGanttChart,
              },
              {
                key: "add-metric",
                icon: <DashboardOutlined />,
                label: "Metric",
                onClick: () => addWidget("metric"),
              },
              {
                key: "add-table",
                icon: <TableOutlined />,
                label: "Table",
                onClick: () => addWidget("table"),
              },
            ],
          },
          {
            key: "other-functions",
            icon: <AppstoreOutlined />,
            label: "Dashboard Actions",
            children: [
              {
                key: "export-pdf",
                icon: <DownloadOutlined />,
                label: "Export as PDF",
                onClick: () => setIsExportModalVisible(true),
              },
              { key: "email-dashboard", icon: <MailOutlined />, label: "Email Dashboard", onClick: emailDashboard },
              { key: "save-template", icon: <SaveOutlined />, label: "Save as Template", onClick: saveAsTemplate },
              {
                key: "save-version",
                icon: <SaveOutlined />,
                label: "Save Snapshot",
                onClick: () => setIsSnapshotModalVisible(true),
              },
              {
                key: "version-history",
                icon: <HistoryOutlined />,
                label: "Version History",
                onClick: () => setIsVersionHistoryVisible(true),
              },
              { key: "feedback", icon: <MailOutlined />, label: "Feedback", onClick: showFeedbackModal },
            ],
          },
        ]
      : []),
  ];
  return (
    <Layout
      className="custom-layout light-theme"
      style={{ minHeight: "100vh", width: "100%", height: "100%" }}
    >
      <Sider
        collapsible
        width={250}
        collapsedWidth={80}
        className="fixed-sider"
        collapsed={collapsed}
        onCollapse={onCollapse}
      >
        {!collapsed && <div className="logo">Dashboard</div>}
        <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} />
      </Sider>
      <Layout
        style={{
          marginLeft: !isFullScreen ? (collapsed ? 80 : 250) : 0,
          transition: "margin-left 0.2s",
        }}
      >
        <ImportChartModal
          visible={isImportChartModalVisible}
          onCancel={handleImportChartModalCancel}
        />
        <Content style={{ margin: "12px" }}>
          <div style={{ padding: 10, background: "var(--background-color)", minHeight: 360 }}>
            {children ? children : <Outlet />}
          </div>
        </Content>
        {isInDashboard && (
          <Modal
            title="Export dashboard as PDF"
            open={isExportModalVisible}
            onCancel={() => setIsExportModalVisible(false)}
            onOk={() => exportForm.submit()}
            okText="Export PDF"
          >
            <Form
              form={exportForm}
              layout="vertical"
              initialValues={{ scale: 2, margin: 20 }}
              onFinish={handleExportSubmit}
            >
              <Form.Item name="fileName" label="File name">
                <Input placeholder="Defaults to dashboard title" />
              </Form.Item>
              <Form.Item name="scale" label="Image quality scale">
                <InputNumber min={1} max={3} step={0.5} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="margin" label="Margin (points)">
                <InputNumber min={0} max={72} style={{ width: "100%" }} />
              </Form.Item>
            </Form>
          </Modal>
        )}
        {isInDashboard && (
          <Modal
            title="Submit Feedback"
            open={isFeedbackModalVisible}
            onCancel={handleFeedbackCancel}
            footer={null}
          >
            <Form form={feedbackForm} onFinish={handleFeedbackSubmit}>
              <Form.Item name="name" label="Name">
                <Input placeholder="Your name (optional)" />
              </Form.Item>
              <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
                <Input placeholder="Your email (optional)" />
              </Form.Item>
              <Form.Item
                name="subject"
                label="Subject"
                rules={[{ required: true, message: "Please enter a subject" }]}
              >
                <Input placeholder="Subject" />
              </Form.Item>
              <Form.Item
                name="message"
                label="Message"
                rules={[{ required: true, message: "Please enter your message" }]}
              >
                <Input.TextArea rows={4} placeholder="Your message" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Send Feedback
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        )}
        {isInDashboard && (
          <Modal
            title="Save dashboard snapshot"
            open={isSnapshotModalVisible}
            onCancel={() => setIsSnapshotModalVisible(false)}
            onOk={() => snapshotForm.submit()}
            okText="Save Snapshot"
          >
            <Form form={snapshotForm} layout="vertical" onFinish={handleSnapshotSubmit}>
              <Form.Item name="name" label="Snapshot name">
                <Input placeholder="e.g. Month-end executive version" />
              </Form.Item>
              <Form.Item name="note" label="Notes">
                <Input.TextArea rows={3} placeholder="Optional context about what changed" />
              </Form.Item>
            </Form>
          </Modal>
        )}
        {isInDashboard && (
          <VersionHistoryModal
            visible={isVersionHistoryVisible}
            onClose={() => setIsVersionHistoryVisible(false)}
          />
        )}
        <DashboardSettingsModal
          visible={isSettingsModalVisible}
          onClose={() => setIsSettingsModalVisible(false)}
        />
      </Layout>
    </Layout>
  );
};
export default CustomLayout;