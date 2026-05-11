// src/taskpane/components/FirstRun.tsx
import React, { useContext } from "react";
import { Alert, Button, Card, Col, Row, Space, Spin, Typography } from "antd";
import {
  BarChartOutlined,
  FileSearchOutlined,
  PlusOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { DashboardContext } from "../context/DashboardContext";
const { Title, Paragraph, Text } = Typography;
const FirstRun: React.FC = () => {
  const navigate = useNavigate();
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
              actions={[
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/create")}
                >
                  Start Blank
                </Button>,
              ]}
            >
              <Paragraph>
                Create a blank dashboard and add widgets as you analyze the workbook.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              hoverable
              title="Use selected data"
              actions={[
                <Button key="range" icon={<TableOutlined />} onClick={readDataFromExcel}>
                  Read Range
                </Button>,
              ]}
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
              actions={[
                <Button key="chart" icon={<BarChartOutlined />} onClick={importChartImageFromExcel}>
                  Import Chart
                </Button>,
              ]}
            >
              <Paragraph>
                Bring an existing Excel chart into your dashboard as a visual snapshot.
              </Paragraph>
            </Card>
          </Col>
        </Row>
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