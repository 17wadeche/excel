// src/taskpane/components/EditDashboard.tsx
import React, { useEffect, useState, useContext } from 'react';
import { Form, Input, Button, Select, Card, Space, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { DashboardItem, TextData, ChartData, GanttWidgetData, Widget } from './types';
import { DashboardContext } from '../context/DashboardContext';
import TextFormComponent from './TextFormComponent';
const { Option } = Select;
const EditDashboard: React.FC = () => {
  const [form] = Form.useForm();
  const { id } = useParams<{ id: string }>(); // Extract dashboard ID from URL
  const navigate = useNavigate();
  const dashboardContext = useContext(DashboardContext); // Access context
  if (!dashboardContext) {
    throw new Error("DashboardContext must be used within a DashboardProvider");
  }
  const { dashboards, editDashboard } = dashboardContext;
  const [dashboard, setDashboard] = useState<DashboardItem | null>(null);
  useEffect(() => {
    const existingDashboard = dashboards.find((d) => d.id === id);
    if (existingDashboard) {
      setDashboard(existingDashboard);
      form.setFieldsValue(existingDashboard);
    } else {
      message.error('Dashboard not found!');
      navigate('/dashboard-list');
    }
  }, [id, dashboards, form, navigate]);
  const onFinish = (values: any) => {
    const { title, components } = values;
    const updatedComponents: Widget[] = (components || []).map((comp: any): Widget => {
      switch (comp.type) {
        case 'gantt':
          return {
            id: comp.id || uuidv4(),
            type: 'gantt',
            data: {
              title: comp.data?.title ?? '',
              tasks: (comp.data?.tasks || []).map((task: any) => ({
                id: task.id || uuidv4(),
                name: task.name,
                start: task.start,
                end: task.end,
                progress: Number(task.progress ?? 0),
                dependencies: task.dependencies,
                color: task.color,
              })),
            } as GanttWidgetData,
          };
        case 'chart':
          return {
            id: comp.id || uuidv4(),
            type: 'chart',
            data: {
              title: comp.data?.title,
              type: comp.data?.chartType ?? comp.data?.type ?? 'bar',
              labels:
                typeof comp.data?.labels === 'string'
                  ? comp.data.labels.split(',').map((label: string) => label.trim())
                  : comp.data?.labels ?? [],
              associatedRange: comp.data?.associatedRange ?? '',
              worksheetName: comp.data?.worksheetName ?? '',
              datasets: (comp.data?.datasets || []).map((dataset: any) => ({
                label: dataset.label,
                data:
                  typeof dataset.data === 'string'
                    ? dataset.data.split(',').map((num: string) => Number(num.trim()))
                    : dataset.data ?? [],
                backgroundColor: dataset.backgroundColor,
                borderColor: dataset.borderColor,
                borderWidth: Number(dataset.borderWidth ?? 1),
              })),
            } as ChartData,
          };
        case 'text':
          return {
            id: comp.id || uuidv4(),
            type: 'text',
            data: {
              content: comp.data?.content ?? '',
              textColor: comp.data?.textColor ?? '#000000',
              backgroundColor: comp.data?.backgroundColor ?? '#FFFFFF',
              fontSize: Number(comp.data?.fontSize ?? 14),
              titleAlignment: comp.data?.titleAlignment ?? 'left',
            } as TextData,
          };
        default:
          throw new Error(`Unsupported component type: ${comp.type}`);
      }
    });
    const updatedDashboard: DashboardItem = {
      ...dashboard!,
      title,
      components: updatedComponents,
      layouts: dashboard!.layouts ?? {},
      workbookId: dashboard!.workbookId ?? dashboardContext.currentWorkbookId,
      userEmail: dashboard!.userEmail ?? dashboardContext.userEmail,
    };
    editDashboard(updatedDashboard);
    message.success('Dashboard updated successfully!');
    navigate('/dashboard-list');
  };
  if (!dashboard) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <Form
        form={form}
        name="edit_dashboard"
        onFinish={onFinish}
        layout="vertical"
        autoComplete="off"
        initialValues={{
          components: dashboard.components || [],
        }}
      >
        <Form.Item
          name="title"
          label="Dashboard Title"
          rules={[{ required: true, message: 'Please enter the dashboard title' }]}
        >
          <Input placeholder="Enter dashboard title" />
        </Form.Item>
        <Form.List name="components">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card
                  key={key as React.Key}
                  type="inner"
                  title={`Component ${name + 1}`}
                  style={{ marginBottom: 16 }}
                  extra={<MinusCircleOutlined onClick={() => remove(name)} />}
                >
                  <Form.Item
                    {...restField}
                    name={[name, 'type']}
                    rules={[{ required: true, message: 'Missing component type' }]}
                  >
                    <Select placeholder="Select component type">
                      <Option value="gantt">Gantt</Option>
                      <Option value="chart">Chart</Option>
                      <Option value="text">Text</Option>
                    </Select>
                  </Form.Item>
                <Form.Item
                  shouldUpdate={(prevValues, currentValues) =>
                    prevValues.components?.[name]?.type !== currentValues.components?.[name]?.type
                  }
                  noStyle
                >
                  {({ getFieldValue }) => {
                      const type = getFieldValue(['components', name, 'type']);
                      switch (type) {
                        case 'gantt':
                          return (
                            <Form.Item name={[name, 'data']}>
                              <GanttChartFields />
                            </Form.Item>
                          );
                        case 'chart':
                          return (
                            <Form.Item name={[name, 'data']}>
                              <ChartFields />
                            </Form.Item>
                          );
                        case 'text':
                          return (
                            <Form.Item name={[name, 'data']}>
                              <TextFormComponent />
                            </Form.Item>
                          );
                        default:
                          return null;
                      }
                    }}
                  </Form.Item>
                </Card>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add({ type: 'gantt', data: { tasks: [] } })}
                  block
                  icon={<PlusOutlined />}
                >
                  Add Component
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Update Dashboard
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
const GanttChartFields: React.FC = () => {
  return (
    <>
      <Form.List name={['data', 'tasks']}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <Space
                key={key}
                align="baseline"
                style={{ display: 'flex', marginBottom: 8 }}
              >
                <Form.Item
                  {...restField}
                  name={[name, 'id']}
                  initialValue={uuidv4()}
                  hidden
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'name']}
                  rules={[{ required: true, message: 'Missing task name' }]}
                >
                  <Input placeholder="Task Name" />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'start']}
                  rules={[{ required: true, message: 'Missing start date' }]}
                >
                  <Input placeholder="Start Date (YYYY-MM-DD)" />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'end']}
                  rules={[{ required: true, message: 'Missing end date' }]}
                >
                  <Input placeholder="End Date (YYYY-MM-DD)" />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'progress']}
                  rules={[{ required: true, message: 'Missing progress' }]}
                >
                  <Input placeholder="Progress (0-100)" type="number" min={0} max={100} />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'dependencies']}
                >
                  <Input placeholder="Dependencies (comma-separated IDs)" />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(name)} />
              </Space>
            ))}
            <Form.Item>
              <Button
                type="dashed"
                onClick={() =>
                  add({
                    id: uuidv4(),
                    name: '',
                    start: '',
                    end: '',
                    progress: 0,
                    dependencies: '',
                  })
                }
                block
                icon={<PlusOutlined />}
              >
                Add Task
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
    </>
  );
};
const ChartFields: React.FC = () => {
  return (
    <>
      <Form.Item
        name={['data', 'title']}
        label="Chart Title"
        rules={[{ required: true, message: 'Please enter chart title' }]}
      >
        <Input placeholder="Enter chart title" />
      </Form.Item>
      <Form.Item
        name={['data', 'chartType']}
        label="Chart Type"
        rules={[{ required: true, message: 'Please select chart type' }]}
      >
        <Select placeholder="Select chart type">
          <Option value="bar">Bar</Option>
          <Option value="pie">Pie</Option>
          <Option value="line">Line</Option>
          <Option value="doughnut">Doughnut</Option>
        </Select>
      </Form.Item>
      <Form.Item
        name={['data', 'labels']}
        label="Labels (comma-separated)"
        rules={[{ required: true, message: 'Please enter labels' }]}
      >
        <Input placeholder="Enter labels separated by commas" />
      </Form.Item>
      <Form.List name={['data', 'datasets']}>
        {(fields, { add, remove }) => (
            <>
            {fields.map(({ key, name, ...restField }) => (
                <Space
                key={key}
                align="baseline"
                style={{ display: 'flex', marginBottom: 8 }}
                >
                <Form.Item
                    {...restField}
                    name={[name, 'id']}
                    initialValue={uuidv4()}
                    hidden
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    {...restField}
                    name={[name, 'label']}
                    rules={[{ required: true, message: 'Missing dataset label' }]}
                >
                    <Input placeholder="Dataset Label" />
                </Form.Item>
                <Form.Item
                    {...restField}
                    name={[name, 'data']}
                    rules={[{ required: true, message: 'Missing data points' }]}
                >
                    <Input placeholder="Data Points (comma-separated numbers)" />
                </Form.Item>
                <Form.Item
                    {...restField}
                    name={[name, 'backgroundColor']}
                >
                    <Input placeholder="Background Color" />
                </Form.Item>
                <Form.Item
                    {...restField}
                    name={[name, 'borderColor']}
                >
                    <Input placeholder="Border Color" />
                </Form.Item>
                <Form.Item
                    {...restField}
                    name={[name, 'borderWidth']}
                    rules={[{ required: true, message: 'Missing border width' }]}
                >
                    <Input placeholder="Border Width" type="number" min={0} />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
            ))}
            <Form.Item>
                <Button
                type="dashed"
                onClick={() =>
                    add({
                    id: uuidv4(),
                    label: '',
                    data: '',
                    backgroundColor: '',
                    borderColor: '',
                    borderWidth: 1,
                    })
                }
                block
                icon={<PlusOutlined />}
                >
                Add Dataset
                </Button>
            </Form.Item>
            </>
        )}
        </Form.List>
    </>
  );
};
const TextFields: React.FC = () => {
  return (
    <>
      <Form.Item
        name={['data', 'content']}
        label="Content"
        rules={[{ required: true, message: 'Please enter content' }]}
      >
        <Input.TextArea placeholder="Enter text content" />
      </Form.Item>
      <Form.Item
        name={['data', 'textColor']}
        label="Text Color"
      >
        <Input placeholder="Enter text color (e.g., #000000)" />
      </Form.Item>
      <Form.Item
        name={['data', 'backgroundColor']}
        label="Background Color"
      >
        <Input placeholder="Enter background color (e.g., #FFFFFF)" />
      </Form.Item>
      <Form.Item
        name={['data', 'fontSize']}
        label="Font Size"
        rules={[{ required: true, message: 'Please enter font size' }]}
      >
        <Input placeholder="Enter font size (e.g., 14)" type="number" min={8} />
      </Form.Item>
    </>
  );
};
export default EditDashboard;