"""Offline regression checks. Requires the aws-sam-translator Python package."""
from copy import deepcopy
from pathlib import Path
import unittest

import boto3
from samtranslator.parser.parser import Parser
from samtranslator.translator.translator import Translator
from samtranslator.yaml_helper import yaml_parse


class AcademicSimulationTest(unittest.TestCase):
    def transformed(self, stage):
        source = Path(__file__).with_name("template.yaml")
        template = yaml_parse(source.read_text(encoding="utf-8"))
        # Translation only: no packaging, credentials, SDK requests or AWS resources.
        template["Globals"]["Function"]["CodeUri"] = "s3://offline-placeholder/function.zip"
        translator = Translator(
            {"AWSLambdaBasicExecutionRole": "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"},
            Parser(), boto_session=boto3.session.Session(region_name="us-east-1"),
        )
        return translator.translate(deepcopy(template), {"Stage": stage, "CognitoDomainPrefix": "aqp-offline-test"})

    def test_academic_route_has_one_condition_and_access_scope(self):
        template = self.transformed("academic")
        paths = template["Resources"]["Api"]["Properties"]["Body"]["paths"]
        condition, enabled, disabled = paths["/v1/donations/{donationId}/simulate"]["Fn::If"]
        self.assertEqual(condition, "IsAcademic")
        self.assertEqual(disabled, {"Ref": "AWS::NoValue"})
        self.assertNotIn("Fn::If", str(enabled))
        self.assertEqual(enabled["post"]["security"], [{"Cognito": ["api/donations.write"]}])
        self.assertEqual(enabled["post"]["x-amazon-apigateway-integration"]["payloadFormatVersion"], "2.0")
        self.assertIn("get", paths["/v1/projects"])
        self.assertIn("post", paths["/v1/donations"])

    def test_production_excludes_route_function_role_permission_and_logs(self):
        template = self.transformed("production")
        self.assertEqual(template["Conditions"]["IsAcademic"], {"Fn::Equals": [{"Ref": "Stage"}, "academic"]})
        path = template["Resources"]["Api"]["Properties"]["Body"]["paths"]["/v1/donations/{donationId}/simulate"]
        self.assertEqual(path["Fn::If"][0], "IsAcademic")
        self.assertEqual(path["Fn::If"][2], {"Ref": "AWS::NoValue"})
        for name in ["Simulate", "SimulateRole", "SimulationInvokePermission", "SimulationLogs"]:
            self.assertEqual(template["Resources"][name]["Condition"], "IsAcademic", name)

    def test_invoke_permission_is_restricted_to_the_simulation_route(self):
        template = self.transformed("academic")
        permission = template["Resources"]["SimulationInvokePermission"]["Properties"]
        self.assertEqual(permission["Principal"], "apigateway.amazonaws.com")
        self.assertEqual(permission["Action"], "lambda:InvokeFunction")
        self.assertEqual(permission["FunctionName"], {"Ref": "Simulate"})
        self.assertTrue(permission["SourceArn"]["Fn::Sub"].endswith("${Api}/${Stage}/POST/v1/donations/*/simulate"))


if __name__ == "__main__":
    unittest.main()
