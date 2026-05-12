// src/taskpane/components/FirstRun.tsx
import React, { useContext, useState } from "react";
import { Alert, Button, Card, Col, Row, Space, Spin, Steps, Typography } from "antd";
import {
  BarChartOutlined,
  FileSearchOutlined,
  PlusOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { DashboardContext } from "../context/DashboardContext";
const { Title, Paragraph, Text } = Typography;
type StartPath = "blank" | "range" | "chart";
const FirstRun: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPath, setSelectedPath] = useState<StartPath>("blank");
  const dashboardContext = useContext(DashboardContext);
  if (!dashboardContext) {
    return null;
  }
  const {
    dashboards,
    currentWorkbookId,
    userEmail,
    isFetching,
    readDataFromExcel,
    importChartImageFromExcel,
  } = dashboardContext;
  const hasDashboards = dashboards.length > 0;
  const startPathDetails: Record<StartPath, { title: string; description: string; action: React.ReactNode }> = {
    blank: {
      title: "Create a blank dashboard",
      description: "Start with an empty canvas, then add charts, KPI cards, tables, images, and text widgets as you analyze the workbook.",
      action: (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/create")}>
          Start Blank
        </Button>
      ),
    },
    range: {
      title: "Build from selected data",
      description: "Select a worksheet range first. The add-in will inspect headers and numeric columns, then create a data-backed chart widget.",
      action: (
        <Button icon={<TableOutlined />} onClick={readDataFromExcel}>
          Import Selected Range
        </Button>
      ),
    },
    chart: {
      title: "Import existing workbook charts",
      description: "Use this when your workbook already has polished Excel charts that should appear as dashboard image snapshots.",
      action: (
        <Button icon={<BarChartOutlined />} onClick={importChartImageFromExcel}>
          Import Chart Images
        </Button>
      ),
    },
  };
  const selected = startPathDetails[selectedPath];
  return (
    <div style={{ padding: 24 }}>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={2}>Welcome to Workbook Dashboard</Title>
          <Paragraph>
            Build dashboards from Excel ranges, workbook charts, KPI cards, tables, and Gantt data
            without leaving Excel.
          </Paragraph>
        </div>
        <Steps
          current={!currentWorkbookId || !userEmail ? 0 : hasDashboards ? 2 : 1}
          items={[
            { title: "Connect", description: "Workbook and user identity" },
            { title: "Choose source", description: "Blank, range, or chart" },
            { title: "Open dashboard", description: "Edit, save, export, share" },
          ]}
        />
        {!currentWorkbookId && (
          <Alert
            type="warning"
            showIcon
            title="Workbook identity not found yet"
            description="Create a dashboard to stamp this workbook with an add-in identity, or reopen the task pane after the workbook is ready."
          />
        )}
        {!userEmail && (
          <Alert
            type="info"
            showIcon
            title="User identity is not configured"
            description="You can keep using the add-in locally, but production deployments should connect this to your organization sign-in flow."
          />
        )}
        {isFetching ? (
          <Spin description="Checking for dashboards in this workbook..." />
        ) : hasDashboards ? (
          <Alert
            type="success"
            showIcon
            title={`Found ${dashboards.length} dashboard${dashboards.length === 1 ? "" : "s"} for this workbook`}
            action={
              <Button onClick={() => navigate("/dashboard-list")}>Open Dashboard List</Button>
            }
          />
        ) : (
          <Alert
            type="info"
            showIcon
            title="No dashboards found for this workbook"
            description="Start with a blank dashboard, select worksheet data, or import an existing Excel chart image."
          />
        )}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card
              hoverable
              title="Create a dashboard"
              onClick={() => setSelectedPath("blank")}
              style={{ borderColor: selectedPath === "blank" ? "#1677ff" : undefined }}
            >
              <Paragraph>Create a blank dashboard and add widgets as you analyze the workbook.</Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              hoverable
              title="Use selected data"
              onClick={() => setSelectedPath("range")}
              style={{ borderColor: selectedPath === "range" ? "#1677ff" : undefined }}
            >
              <Paragraph>
                Select a worksheet range first, then let the add-in create a data-backed table or
                chart widget.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              hoverable
              title="Import workbook chart"
              onClick={() => setSelectedPath("chart")}
              style={{ borderColor: selectedPath === "chart" ? "#1677ff" : undefined }}
            >
              <Paragraph>Bring an existing Excel chart into your dashboard as a visual snapshot.</Paragraph>
            </Card>
          </Col>
        </Row>
        <Card title={selected.title} actions={[selected.action]}>
          <Paragraph>{selected.description}</Paragraph>
        </Card>
        <Button
          icon={<FileSearchOutlined />}
          onClick={() => navigate("/dashboard-list")}
          disabled={!hasDashboards}
        >
          Browse existing dashboards
        </Button>
        <Text type="secondary">
          Tip: production users need the task pane web app hosted on HTTPS; local sideloading can
          use localhost.
        </Text>
      </Space>
    </div>
  );
};
export default FirstRun;