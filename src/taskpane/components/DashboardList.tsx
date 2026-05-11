// src/taskpane/components/DashboardList.tsx
import React, { useContext, useMemo, useState } from "react";
import {
  Layout,
  List,
  Button,
  Typography,
  Modal,
  Card,
  Tooltip,
  Row,
  Col,
  Input,
  Divider,
  Empty,
  Alert,
  Spin,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { DashboardContext } from "../context/DashboardContext";
import "./DashboardList.css";
const { Content } = Layout;
const { Title } = Typography;
const { Search } = Input;
const DashboardList: React.FC = () => {
  const { dashboards, deleteDashboard, currentWorkbookId, userEmail, isFetching } =
    useContext(DashboardContext)!;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const filteredDashboards = useMemo(
    () =>
      dashboards.filter((dashboard) =>
        dashboard.title.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [dashboards, searchTerm]
  );
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: "Are you sure you want to delete this dashboard?",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        await deleteDashboard(id);
      },
      maskClosable: true,
    });
  };
  const handleView = (id: string) => {
    navigate(`/dashboard/${id}`);
  };
  const handleEdit = (id: string) => {
    navigate(`/edit-dashboard/${id}`);
  };
  const handleCreateNew = () => {
    navigate("/create");
  };
  return (
    <Layout style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      <Content>
        <Row justify="space-between" align="middle" style={{ marginBottom: "24px" }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              My Dashboards
            </Title>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateNew}
              size="large"
              style={{ borderRadius: "8px", height: "50px" }}
            >
              Create New Dashboard
            </Button>
          </Col>
        </Row>
        <Row justify="center" style={{ marginBottom: "24px" }}>
          <Col xs={24} sm={16} md={12} lg={8}>
            <Search
              placeholder="Search Dashboards"
              enterButton={<SearchOutlined />}
              allowClear
              size="large"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
        </Row>
        <Divider />
        {!currentWorkbookId && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: "16px" }}
            message="Workbook identity is not available"
            description="Create a new dashboard to initialize this workbook, or reopen the task pane after the workbook finishes loading."
          />
        )}
        {!userEmail && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: "16px" }}
            message="User identity is not configured"
            description="Dashboards may still work locally, but shared production use should connect the add-in to your sign-in flow."
          />
        )}
        {isFetching ? (
          <Spin tip="Loading dashboards..." />
        ) : filteredDashboards.length === 0 ? (
          <Empty
            description={
              searchTerm
                ? "No dashboards match your search"
                : "No dashboards found for this workbook"
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
              Create Your First Dashboard
            </Button>
          </Empty>
        ) : (
          <List
            grid={{
              gutter: 24,
              xs: 1,
              sm: 2,
              md: 3,
              lg: 4,
              xl: 4,
              xxl: 6,
            }}
            dataSource={filteredDashboards}
            renderItem={(dashboard) => (
              <List.Item>
                <Card
                  hoverable
                  actions={[
                    <Tooltip title="View Dashboard" key="view">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleView(dashboard.id);
                        }}
                      />
                    </Tooltip>,
                    <Tooltip title="Edit Dashboard" key="edit">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEdit(dashboard.id);
                        }}
                      />
                    </Tooltip>,
                    <Tooltip title="Delete Dashboard" key="delete">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(dashboard.id);
                        }}
                      />
                    </Tooltip>,
                  ]}
                  className="dashboard-list-card"
                  tabIndex={0}
                  onClick={() => handleView(dashboard.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleView(dashboard.id);
                    }
                  }}
                >
                  <Card.Meta
                    title={
                      <span style={{ fontSize: "18px", fontWeight: "500", color: "#001529" }}>
                        {dashboard.title || "Untitled Dashboard"}
                      </span>
                    }
                    description={
                      <span style={{ color: "#595959" }}>
                        Components: {dashboard.components.length}
                      </span>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Content>
    </Layout>
  );
};
export default DashboardList;